#include "CartController.h"

#include <memory>
#include <string>

#include <drogon/drogon.h>
#include <json/json.h>

namespace {
using drogon::HttpRequestPtr;
using drogon::HttpResponsePtr;
using Callback = std::function<void(const HttpResponsePtr &)>;
using CallbackPtr = std::shared_ptr<Callback>;

drogon::orm::DbClientPtr dbClient() {
  static auto client = drogon::app().getDbClient("default");
  return client;
}

void sendJson(const CallbackPtr &callback, drogon::HttpStatusCode status,
              Json::Value body) {
  auto response = drogon::HttpResponse::newHttpJsonResponse(body);
  response->setStatusCode(status);
  (*callback)(response);
}

std::optional<int> getAccountId(const HttpRequestPtr &req) {
    auto session = req->session();
    if (session) {
        return session->getOptional<int>("account_id");
    }
    return std::nullopt;
}

} // namespace

namespace api {

void CartController::getCart(const HttpRequestPtr &req, Callback &&callback) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);

    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    int accountId = accountIdOpt.value();

    auto onResult = [callbackPtr, accountId](const drogon::orm::Result &result) {
        Json::Value cart(Json::objectValue);
        cart["account_id"] = accountId;
        Json::Value items(Json::arrayValue);
        for (const auto &row : result) {
            Json::Value item;
            item["internal_id"]    = row["item_id"].as<int>();
            item["item_name"]      = row["item_name"].as<std::string>();
            item["category"]       = row["category"].isNull()   ? "" : row["category"].as<std::string>();
            item["image_url"]      = row["image_path"].isNull() ? "" : row["image_path"].as<std::string>();
            item["quantity"]       = row["quantity"].as<int>();
            if (row["logged_price"].isNull()) {
                item["price"]      = Json::Value(Json::nullValue);
            } else {
                item["price"]      = row["logged_price"].as<double>();
            }
            if (row["store_name"].isNull()) {
                item["store_id"]   = Json::Value(Json::nullValue);
                item["store_name"] = Json::Value(Json::nullValue);
            } else {
                item["store_id"]   = row["store_id"].as<int>();
                item["store_name"] = row["store_name"].as<std::string>();
            }
            items.append(item);
        }
        cart["items"] = items;
        sendJson(callbackPtr, drogon::k200OK, std::move(cart));
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to load cart: " << e.base().what();
        Json::Value body;
        body["message"] = "Failed to load cart";
        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    dbClient()->execSqlAsync(
        "SELECT i.item_id, i.item_name, i.category, i.image_path, "
        "ci.quantity, pe.logged_price, s.store_id, s.name AS store_name "
        "FROM cart_items ci "
        "JOIN items i ON ci.item_id = i.item_id "
        "LEFT JOIN price_entries pe ON ci.price_entry_id = pe.entry_id "
        "LEFT JOIN stores s ON pe.store_id = s.store_id "
        "WHERE ci.account_id = $1",
        onResult, onError, accountId);
}

void CartController::addItem(const HttpRequestPtr &req, Callback &&callback) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);

    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    auto json = req->getJsonObject();
    if (!json || !json->isMember("item_id")) {
        Json::Value body;
        body["message"] = "Missing item_id in request body";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    int itemId   = (*json)["item_id"].asInt();
    int quantity = json->isMember("quantity") ? (*json)["quantity"].asInt() : 1;

    // price_entry_id is optional — use NULL if not provided
    bool hasPriceEntry = json->isMember("price_entry_id") && !(*json)["price_entry_id"].isNull();
    int  priceEntryId  = hasPriceEntry ? (*json)["price_entry_id"].asInt() : 0;

    auto onResult = [callbackPtr](const drogon::orm::Result &result) {
        Json::Value body;
        body["message"] = "Item added to cart";
        sendJson(callbackPtr, drogon::k200OK, std::move(body));
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to add item to cart: " << e.base().what();
        Json::Value body;
        body["message"] = "Failed to add item to cart";
        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    if (hasPriceEntry) {
        dbClient()->execSqlAsync(
            "INSERT INTO cart_items (account_id, item_id, quantity, price_entry_id) "
            "VALUES ($1, $2, $3, $4) "
            "ON CONFLICT (account_id, item_id) DO UPDATE "
            "SET quantity = EXCLUDED.quantity, price_entry_id = EXCLUDED.price_entry_id",
            onResult, onError, accountIdOpt.value(), itemId, quantity, priceEntryId);
    } else {
        dbClient()->execSqlAsync(
            "INSERT INTO cart_items (account_id, item_id, quantity) "
            "VALUES ($1, $2, $3) "
            "ON CONFLICT (account_id, item_id) DO UPDATE "
            "SET quantity = EXCLUDED.quantity, price_entry_id = NULL",
            onResult, onError, accountIdOpt.value(), itemId, quantity);
    }
}

void CartController::removeItem(const HttpRequestPtr &req, Callback &&callback, int itemId) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);

    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    auto onResult = [callbackPtr](const drogon::orm::Result &result) {
        Json::Value body;
        body["message"] = "Item removed from cart";
        sendJson(callbackPtr, drogon::k200OK, std::move(body));
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to remove item from cart: " << e.base().what();
        Json::Value body;
        body["message"] = "Failed to remove item from cart";
        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    dbClient()->execSqlAsync(
        "DELETE FROM cart_items WHERE account_id = $1 AND item_id = $2",
        onResult, onError, accountIdOpt.value(), itemId);
}

} // namespace api
