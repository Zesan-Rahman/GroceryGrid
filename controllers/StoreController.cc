#include "StoreController.h"

#include <cstdlib>
#include <memory>
#include <string>
#include <utility>

#include <drogon/drogon.h>
#include <json/json.h>

namespace
{
using drogon::HttpResponsePtr;
using Callback = std::function<void(const HttpResponsePtr &)>;
using CallbackPtr = std::shared_ptr<Callback>;
constexpr char kStoreOwnerRole[] = "store_owner";

drogon::orm::DbClientPtr dbClient()
{
    static auto client = drogon::app().getDbClient("default");
    return client;
}

void sendJsonArray(const CallbackPtr &callback,
                   drogon::HttpStatusCode status,
                   Json::Value body)
{
    auto response = drogon::HttpResponse::newHttpJsonResponse(body);
    response->setStatusCode(status);
    (*callback)(response);
}

Json::Value parseHours(const std::string &hoursText)
{
    if (hoursText.empty())
    {
        return Json::Value(Json::objectValue);
    }

    Json::CharReaderBuilder builder;
    Json::Value hours(Json::objectValue);
    std::string errors;
    std::unique_ptr<Json::CharReader> reader(builder.newCharReader());

    const bool parsed = reader->parse(hoursText.data(),
                                      hoursText.data() + hoursText.size(),
                                      &hours,
                                      &errors);
    if (!parsed || !hours.isObject())
    {
        return Json::Value(Json::objectValue);
    }

    return hours;
}

void sendJson(const CallbackPtr &callback,
              drogon::HttpStatusCode status,
              Json::Value body)
{
    auto response = drogon::HttpResponse::newHttpJsonResponse(body);
    response->setStatusCode(status);
    (*callback)(response);
}

std::string trim(const std::string &value)
{
    const auto start = value.find_first_not_of(" \t\r\n");
    if (start == std::string::npos)
    {
        return "";
    }

    const auto end = value.find_last_not_of(" \t\r\n");
    return value.substr(start, end - start + 1);
}

bool requireStoreOwner(const drogon::HttpRequestPtr &req, const CallbackPtr &callback)
{
    auto session = req->session();
    if (!session)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Session support is unavailable";
        sendJson(callback, drogon::k500InternalServerError, std::move(body));
        return false;
    }

    if (!session->find("account_id"))
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Authentication required";
        sendJson(callback, drogon::k401Unauthorized, std::move(body));
        return false;
    }

    const auto role = session->getOptional<std::string>("role");
    if (!role || *role != kStoreOwnerRole)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Store owner access required";
        sendJson(callback, drogon::k403Forbidden, std::move(body));
        return false;
    }

    return true;
}

Json::Value ownerStoreJson(const drogon::orm::Row &row)
{
    Json::Value store(Json::objectValue);
    store["store_id"] = row["store_id"].as<int>();
    store["name"] = row["name"].as<std::string>();
    store["address"] = row["address"].as<std::string>();
    store["website"] = row["website"].isNull()
                           ? Json::Value()
                           : Json::Value(row["website"].as<std::string>());
    store["phone"] = row["phone"].isNull()
                         ? Json::Value()
                         : Json::Value(row["phone"].as<std::string>());
    store["parking"] = row["parking"].isNull()
                           ? Json::Value()
                           : Json::Value(row["parking"].as<std::string>());
    store["entry_count"] = row["entry_count"].as<int>();
    store["item_count"] = row["item_count"].as<int>();
    return store;
}

template <typename SuccessHandler>
void withOwnerStore(const drogon::orm::DbClientPtr &client,
                    int accountId,
                    const CallbackPtr &callback,
                    SuccessHandler &&onSuccess)
{
    client->execSqlAsync(
        "select s.store_id, s.name, s.address, s.website, s.phone, s.parking, "
        "       count(pe.entry_id)::int as entry_count, "
        "       count(distinct pe.item_id)::int as item_count "
        "from store_owners so "
        "join stores s on s.store_id = so.store_id "
        "left join price_entries pe on pe.store_id = s.store_id "
        "where so.account_id = $1 and so.is_verified = true "
        "group by s.store_id, s.name, s.address, s.website, s.phone, s.parking "
        "limit 1",
        [callback, onSuccess = std::forward<SuccessHandler>(onSuccess)](
            const drogon::orm::Result &result) mutable {
            if (result.empty())
            {
                Json::Value body(Json::objectValue);
                body["success"] = false;
                body["message"] = "No verified store is linked to this owner account";
                sendJson(callback, drogon::k404NotFound, std::move(body));
                return;
            }

            onSuccess(result[0]);
        },
        [callback](const drogon::orm::DrogonDbException &e) {
            LOG_ERROR << "Store owner lookup failed: " << e.base().what();
            Json::Value body(Json::objectValue);
            body["success"] = false;
            body["message"] = "Unable to load store details";
            sendJson(callback, drogon::k500InternalServerError, std::move(body));
        },
        accountId);
}
}  // namespace

namespace api
{
void StoreController::listStores(
    const drogon::HttpRequestPtr &,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));

    dbClient()->execSqlAsync(
        "select store_id, name, address, latitude, longitude, phone, website, "
        "hours, parking from stores order by name asc",
        [callbackPtr](const drogon::orm::Result &result) {
            Json::Value stores(Json::arrayValue);

            for (const auto &row : result)
            {
                Json::Value store(Json::objectValue);
                store["store_id"] = row["store_id"].as<int>();
                store["name"] = row["name"].as<std::string>();
                store["address"] = row["address"].as<std::string>();
                store["latitude"] =
                    std::strtod(row["latitude"].as<std::string>().c_str(), nullptr);
                store["longitude"] =
                    std::strtod(row["longitude"].as<std::string>().c_str(), nullptr);
                store["phone"] = row["phone"].isNull()
                                     ? Json::Value()
                                     : Json::Value(row["phone"].as<std::string>());
                store["website"] = row["website"].isNull()
                                       ? Json::Value()
                                       : Json::Value(row["website"].as<std::string>());
                store["hours"] = row["hours"].isNull()
                                     ? Json::Value(Json::objectValue)
                                     : parseHours(row["hours"].as<std::string>());
                store["parking"] = row["parking"].isNull()
                                       ? Json::Value()
                                       : Json::Value(row["parking"].as<std::string>());
                stores.append(store);
            }

            sendJsonArray(callbackPtr, drogon::k200OK, std::move(stores));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            LOG_ERROR << "Store list query failed: " << e.base().what();

            Json::Value body(Json::objectValue);
            body["message"] = "Unable to load stores";
            sendJsonArray(callbackPtr, drogon::k500InternalServerError, std::move(body));
        });
}

void StoreController::viewCatalog(
    const drogon::HttpRequestPtr &,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback,
    int storeId) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));

    // selects all the items and prices matching the store_id. if there are
    // multiple entries for an item, that latest is given
    std::string sql =
        "SELECT DISTINCT ON (i.item_id) "
        "   i.item_id, i.item_name, i.category, "
        "   p.entry_id, p.store_id, p.logged_price, p.price_date "
        "FROM items i "
        "JOIN price_entries p ON i.item_id = p.item_id "
        "WHERE p.store_id = $1 "
        "ORDER BY i.item_id, p.price_date DESC";

    dbClient()->execSqlAsync(
        sql,
        [callbackPtr](const drogon::orm::Result &result) {
            Json::Value catalog(Json::arrayValue);

            for (const auto &row : result)
            {
                Json::Value item(Json::objectValue);
                item["item_id"] = row["item_id"].as<int>();
                item["entry_id"] = row["entry_id"].as<int>();
                item["store_id"] = row["store_id"].as<int>();
                item["name"] = row["item_name"].as<std::string>();
                item["category"] = row["category"].isNull()
                                    ? "Uncategorized"
                                    : row["category"].as<std::string>();
                item["price"] = std::atof(row["logged_price"].as<std::string>().c_str());
                item["last_updated"] = row["price_date"].as<std::string>();
                catalog.append(item);
            }

            sendJsonArray(callbackPtr, drogon::k200OK, std::move(catalog));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            LOG_ERROR << "Catalog query failed: " << e.base().what();
            Json::Value body(Json::objectValue);
            body["message"] = "Unable to load store catalog";
            sendJsonArray(callbackPtr, drogon::k500InternalServerError, std::move(body));
        },
        storeId);
}

void StoreController::getOwnerStore(
    const drogon::HttpRequestPtr &req,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireStoreOwner(req, callbackPtr))
    {
        return;
    }

    const int accountId = req->session()->get<int>("account_id");
    withOwnerStore(
        dbClient(),
        accountId,
        callbackPtr,
        [callbackPtr](const drogon::orm::Row &row) {
            Json::Value body(Json::objectValue);
            body["success"] = true;
            body["store"] = ownerStoreJson(row);
            sendJson(callbackPtr, drogon::k200OK, std::move(body));
        });
}

void StoreController::updateOwnerStore(
    const drogon::HttpRequestPtr &req,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireStoreOwner(req, callbackPtr))
    {
        return;
    }

    const auto json = req->getJsonObject();
    if (!json)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Request body must be valid JSON";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    const std::string name = trim((*json).get("name", "").asString());
    const std::string website = trim((*json).get("website", "").asString());
    const std::string phone = trim((*json).get("phone", "").asString());
    const std::string parking = trim((*json).get("parking", "").asString());

    if (name.empty() || name.size() > 255)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Store name is required and must be 255 characters or fewer";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    if (website.size() > 255)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Website must be 255 characters or fewer";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    if (phone.size() > 20)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Phone must be 20 characters or fewer";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    if (parking.size() > 50)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Parking details must be 50 characters or fewer";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    const int accountId = req->session()->get<int>("account_id");
    auto client = dbClient();

    withOwnerStore(
        client,
        accountId,
        callbackPtr,
        [client, callbackPtr, name, website, phone, parking](const drogon::orm::Row &row) {
            const int storeId = row["store_id"].as<int>();

            client->execSqlAsync(
                "update stores "
                "set name = $1, "
                "    website = nullif($2, ''), "
                "    phone = nullif($3, ''), "
                "    parking = nullif($4, ''), "
                "    updated_at = now() "
                "where store_id = $5 "
                "returning store_id, name, address, website, phone, parking",
                [client, callbackPtr](const drogon::orm::Result &updateResult) {
                    if (updateResult.empty())
                    {
                        Json::Value body(Json::objectValue);
                        body["success"] = false;
                        body["message"] = "Store could not be updated";
                        sendJson(callbackPtr, drogon::k404NotFound, std::move(body));
                        return;
                    }

                    const int updatedStoreId = updateResult[0]["store_id"].as<int>();
                    client->execSqlAsync(
                        "select s.store_id, s.name, s.address, s.website, s.phone, s.parking, "
                        "       count(pe.entry_id)::int as entry_count, "
                        "       count(distinct pe.item_id)::int as item_count "
                        "from stores s "
                        "left join price_entries pe on pe.store_id = s.store_id "
                        "where s.store_id = $1 "
                        "group by s.store_id, s.name, s.address, s.website, s.phone, s.parking",
                        [callbackPtr](const drogon::orm::Result &result) {
                            if (result.empty())
                            {
                                Json::Value body(Json::objectValue);
                                body["success"] = false;
                                body["message"] = "Updated store details could not be loaded";
                                sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                                return;
                            }

                            Json::Value body(Json::objectValue);
                            body["success"] = true;
                            body["message"] = "Store details updated";
                            body["store"] = ownerStoreJson(result[0]);
                            sendJson(callbackPtr, drogon::k200OK, std::move(body));
                        },
                        [callbackPtr](const drogon::orm::DrogonDbException &e) {
                            LOG_ERROR << "Updated store reload failed: " << e.base().what();
                            Json::Value body(Json::objectValue);
                            body["success"] = false;
                            body["message"] = "Store was updated, but the refreshed details could not be loaded";
                            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                        },
                        updatedStoreId);
                },
                [callbackPtr](const drogon::orm::DrogonDbException &e) {
                    LOG_ERROR << "Store update failed: " << e.base().what();
                    Json::Value body(Json::objectValue);
                    body["success"] = false;
                    body["message"] = "Unable to update store details";
                    sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                },
                name,
                website,
                phone,
                parking,
                storeId);
        });
}

}  // namespace api
