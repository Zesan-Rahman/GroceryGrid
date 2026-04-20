#include "StoreController.h"

#include <cstdlib>
#include <memory>
#include <string>

#include <drogon/drogon.h>
#include <json/json.h>

namespace
{
using drogon::HttpResponsePtr;
using Callback = std::function<void(const HttpResponsePtr &)>;
using CallbackPtr = std::shared_ptr<Callback>;

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

}  // namespace api
