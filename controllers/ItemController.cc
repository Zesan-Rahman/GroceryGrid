#include "ItemController.h"

#include <memory>
#include <string>

#include <drogon/drogon.h>
#include <json/json.h>

namespace {
using drogon::HttpResponsePtr;
using Callback = std::function<void(const HttpResponsePtr &)>;
using CallbackPtr = std::shared_ptr<Callback>;

drogon::orm::DbClientPtr dbClient() {
  static auto client = drogon::app().getDbClient("default");
  return client;
}

void sendJsonArray(const CallbackPtr &callback, drogon::HttpStatusCode status,
                   Json::Value body) {
  auto response = drogon::HttpResponse::newHttpJsonResponse(body);
  response->setStatusCode(status);
  (*callback)(response);
}
} // namespace

namespace api {
void ItemController::listItems(
    const drogon::HttpRequestPtr &req,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback) const {
  auto callbackPtr = std::make_shared<Callback>(std::move(callback));

  auto searchOpt = req->getOptionalParameter<std::string>("search");

  auto onResult = [callbackPtr](const drogon::orm::Result &result) {
    Json::Value items(Json::arrayValue);
    for (const auto &row : result) {
      Json::Value item(Json::objectValue);
      item["internal_id"] = row["item_id"].as<int>();
      item["item_name"] = row["item_name"].as<std::string>();
      item["category"] =
          row["category"].isNull() ? "" : row["category"].as<std::string>();
      item["image_url"] =
          row["image_path"].isNull() ? "" : row["image_path"].as<std::string>();
      items.append(item);
    }
    sendJsonArray(callbackPtr, drogon::k200OK, std::move(items));
  };

  auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
    LOG_ERROR << "Item list query failed: " << e.base().what();
    Json::Value body(Json::objectValue);
    body["message"] = "Unable to load items";
    sendJsonArray(callbackPtr, drogon::k500InternalServerError,
                  std::move(body));
  };

  if (searchOpt && !searchOpt.value().empty()) {
    std::string sql =
        "SELECT item_id, item_name, category, image_path FROM items WHERE $1 "
        "<% item_name ORDER BY $1 <<-> item_name ASC";
    dbClient()->execSqlAsync(sql, onResult, onError, searchOpt.value());
  } else {
    std::string sql = "SELECT item_id, item_name, category, image_path FROM "
                      "items ORDER BY item_name ASC";
    dbClient()->execSqlAsync(sql, onResult, onError);
  }
}

void ItemController::getItem(
    const drogon::HttpRequestPtr &req,
    std::function<void(const drogon::HttpResponsePtr &)> &&callback,
    int itemId) const {
  auto callbackPtr = std::make_shared<Callback>(std::move(callback));

  auto onItemResult = [callbackPtr,
                       itemId](const drogon::orm::Result &itemResult) {
    if (itemResult.empty()) {
      Json::Value body(Json::objectValue);
      body["message"] = "Item not found";
      auto response = drogon::HttpResponse::newHttpJsonResponse(body);
      response->setStatusCode(drogon::k404NotFound);
      (*callbackPtr)(response);
      return;
    }

    Json::Value item(Json::objectValue);
    item["internal_id"] = itemResult[0]["item_id"].as<int>();
    item["item_name"] = itemResult[0]["item_name"].as<std::string>();
    item["category"] = itemResult[0]["category"].isNull()
                           ? ""
                           : itemResult[0]["category"].as<std::string>();
    item["image_url"] = itemResult[0]["image_path"].isNull()
                            ? ""
                            : itemResult[0]["image_path"].as<std::string>();

    auto onPriceResult = [callbackPtr, item = std::move(item)](
                             const drogon::orm::Result &priceResult) mutable {
      Json::Value price_entries(Json::arrayValue);
      for (const auto &row : priceResult) {
        Json::Value entry(Json::objectValue);
        entry["entry_id"] = row["entry_id"].as<int>();
        entry["store_id"] = row["store_id"].isNull()
                                ? Json::Value(Json::nullValue)
                                : row["store_id"].as<int>();
        entry["store_name"] = row["store_name"].isNull()
                                  ? Json::Value(Json::nullValue)
                                  : row["store_name"].as<std::string>();
        entry["receipt_id"] = row["receipt_id"].isNull()
                                  ? Json::Value(Json::nullValue)
                                  : row["receipt_id"].as<int>();
        entry["logged_price"] = row["logged_price"].as<double>();
        entry["upload_date"] = row["upload_date"].isNull()
                                   ? ""
                                   : row["upload_date"].as<std::string>();
        entry["price_date"] = row["price_date"].isNull()
                                  ? ""
                                  : row["price_date"].as<std::string>();
        price_entries.append(entry);
      }
      item["price_entries"] = price_entries;

      auto response = drogon::HttpResponse::newHttpJsonResponse(item);
      response->setStatusCode(drogon::k200OK);
      (*callbackPtr)(response);
    };

    auto onPriceError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
      LOG_ERROR << "Price list query failed: " << e.base().what();
      Json::Value body(Json::objectValue);
      body["message"] = "Unable to load price entries";
      auto response = drogon::HttpResponse::newHttpJsonResponse(body);
      response->setStatusCode(drogon::k500InternalServerError);
      (*callbackPtr)(response);
    };

    // TODO: also calculate distance from the user and order by distance
    std::string sql = R"(
            SELECT * FROM (
                SELECT DISTINCT ON (pe.store_id) 
                    pe.entry_id, pe.store_id, pe.receipt_id, pe.logged_price, 
                    pe.upload_date, pe.price_date, s.name as store_name 
                FROM price_entries pe 
                LEFT JOIN stores s ON pe.store_id = s.store_id 
                WHERE pe.item_id = $1 
                ORDER BY pe.store_id, pe.price_date DESC NULLS LAST, pe.upload_date DESC
            ) t
            ORDER BY t.price_date DESC NULLS LAST, t.upload_date DESC
        )";
    dbClient()->execSqlAsync(sql, onPriceResult, onPriceError, itemId);
  };

  auto onItemError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
    LOG_ERROR << "Item query failed: " << e.base().what();
    Json::Value body(Json::objectValue);
    body["message"] = "Unable to load item";
    auto response = drogon::HttpResponse::newHttpJsonResponse(body);
    response->setStatusCode(drogon::k500InternalServerError);
    (*callbackPtr)(response);
  };

  std::string sql = "SELECT item_id, item_name, category, image_path FROM "
                    "items WHERE item_id = $1";
  dbClient()->execSqlAsync(sql, onItemResult, onItemError, itemId);
}
} // namespace api
