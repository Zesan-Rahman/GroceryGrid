#include "ItemController.h"

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
}  // namespace

namespace api
{
void ItemController::listItems(
    const drogon::HttpRequestPtr &req,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    
    auto searchOpt = req->getOptionalParameter<std::string>("search");
    
    auto onResult = [callbackPtr](const drogon::orm::Result &result) {
        Json::Value items(Json::arrayValue);
        for (const auto &row : result)
        {
            Json::Value item(Json::objectValue);
            item["internal_id"] = row["item_id"].as<int>();
            item["item_name"] = row["item_name"].as<std::string>();
            item["category"] = row["category"].isNull() ? "" : row["category"].as<std::string>();
            item["image_url"] = row["image_path"].isNull() ? "" : row["image_path"].as<std::string>();
            items.append(item);
        }
        sendJsonArray(callbackPtr, drogon::k200OK, std::move(items));
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Item list query failed: " << e.base().what();
        Json::Value body(Json::objectValue);
        body["message"] = "Unable to load items";
        sendJsonArray(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    if (searchOpt && !searchOpt.value().empty())
    {
        std::string sql = "SELECT item_id, item_name, category, image_path FROM items WHERE $1 <% item_name ORDER BY $1 <<-> item_name ASC";
        dbClient()->execSqlAsync(sql, onResult, onError, searchOpt.value());
    }
    else
    {
        std::string sql = "SELECT item_id, item_name, category, image_path FROM items ORDER BY item_name ASC";
        dbClient()->execSqlAsync(sql, onResult, onError);
    }
}
}  // namespace api
