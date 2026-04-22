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

void CartController::createCart(const HttpRequestPtr &req, Callback &&callback) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);
    
    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    auto onResult = [callbackPtr](const drogon::orm::Result &result) {
        if (result.empty()) {
            Json::Value body;
            body["message"] = "Failed to create cart";
            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
            return;
        }
        Json::Value body;
        body["cart_id"] = result[0]["cart_id"].as<int>();
        sendJson(callbackPtr, drogon::k201Created, std::move(body));
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to create cart: " << e.base().what();
        Json::Value body;
        body["message"] = "Failed to create cart";
        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    dbClient()->execSqlAsync(
        "INSERT INTO carts (account_id) VALUES ($1) RETURNING cart_id",
        onResult, onError, accountIdOpt.value());
}

void CartController::listCarts(const HttpRequestPtr &req, Callback &&callback) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);
    
    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    auto onResult = [callbackPtr](const drogon::orm::Result &result) {
        Json::Value carts(Json::arrayValue);
        for (const auto &row : result) {
            Json::Value cart;
            cart["cart_id"] = row["cart_id"].as<int>();
            carts.append(cart);
        }
        sendJson(callbackPtr, drogon::k200OK, std::move(carts));
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to list carts: " << e.base().what();
        Json::Value body;
        body["message"] = "Failed to load carts";
        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    dbClient()->execSqlAsync(
        "SELECT cart_id FROM carts WHERE account_id = $1 ORDER BY cart_id ASC",
        onResult, onError, accountIdOpt.value());
}

void CartController::getCart(const HttpRequestPtr &req, Callback &&callback, int cartId) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);
    
    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    auto onResult = [callbackPtr, cartId, accountId = accountIdOpt.value()](const drogon::orm::Result &result) {
        if (result.empty() || result[0]["account_id"].as<int>() != accountId) {
            Json::Value body;
            body["message"] = "Cart not found or unauthorized";
            sendJson(callbackPtr, drogon::k404NotFound, std::move(body));
            return;
        }

        auto onItemsResult = [callbackPtr, cartId](const drogon::orm::Result &itemsResult) {
            Json::Value cart(Json::objectValue);
            cart["cart_id"] = cartId;
            Json::Value items(Json::arrayValue);
            for (const auto &row : itemsResult) {
                Json::Value item;
                item["internal_id"] = row["item_id"].as<int>();
                item["item_name"] = row["item_name"].as<std::string>();
                item["category"] = row["category"].isNull() ? "" : row["category"].as<std::string>();
                item["image_url"] = row["image_path"].isNull() ? "" : row["image_path"].as<std::string>();
                items.append(item);
            }
            cart["items"] = items;
            sendJson(callbackPtr, drogon::k200OK, std::move(cart));
        };

        auto onItemsError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
            LOG_ERROR << "Failed to load cart items: " << e.base().what();
            Json::Value body;
            body["message"] = "Failed to load cart items";
            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
        };

        dbClient()->execSqlAsync(
            "SELECT i.item_id, i.item_name, i.category, i.image_path "
            "FROM cart_items ci "
            "JOIN items i ON ci.item_id = i.item_id "
            "WHERE ci.cart_id = $1",
            onItemsResult, onItemsError, cartId);
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to load cart: " << e.base().what();
        Json::Value body;
        body["message"] = "Failed to load cart";
        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    dbClient()->execSqlAsync(
        "SELECT account_id FROM carts WHERE cart_id = $1",
        onResult, onError, cartId);
}

void CartController::addItem(const HttpRequestPtr &req, Callback &&callback, int cartId) const {
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
    
    int itemId = (*json)["item_id"].asInt();

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

    dbClient()->execSqlAsync(
        "INSERT INTO cart_items (cart_id, item_id) "
        "SELECT $1, $2 "
        "WHERE EXISTS (SELECT 1 FROM carts WHERE cart_id = $1 AND account_id = $3) "
        "ON CONFLICT DO NOTHING",
        onResult, onError, cartId, itemId, accountIdOpt.value());
}

void CartController::removeItem(const HttpRequestPtr &req, Callback &&callback, int cartId, int itemId) const {
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
        "DELETE FROM cart_items "
        "WHERE cart_id = $1 AND item_id = $2 "
        "AND EXISTS (SELECT 1 FROM carts WHERE cart_id = $1 AND account_id = $3)",
        onResult, onError, cartId, itemId, accountIdOpt.value());
}

} // namespace api
