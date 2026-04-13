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
}  // namespace api
