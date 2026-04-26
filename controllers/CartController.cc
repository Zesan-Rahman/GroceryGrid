#include "CartController.h"

#include <cmath>
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
                item["price_entry_id"] = Json::Value(Json::nullValue);
            } else {
                item["price"]      = row["logged_price"].as<double>();
                item["price_entry_id"] = row["price_entry_id"].as<int>();
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
        "ci.quantity, pe.logged_price, pe.entry_id as price_entry_id, s.store_id, s.name AS store_name "
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

void CartController::replaceCart(const HttpRequestPtr &req, Callback &&callback) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);

    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    auto json = req->getJsonObject();
    if (!json || !json->isMember("items") || !(*json)["items"].isArray()) {
        Json::Value body;
        body["message"] = "Missing or invalid items array in request body";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    int accountId = accountIdOpt.value();
    auto items = (*json)["items"];

    // Use a transaction to delete old cart items and insert new ones
    dbClient()->execSqlAsync(
        "BEGIN",
        [callbackPtr, accountId, items](const drogon::orm::Result &/*result*/) {
            // Delete all current items
            dbClient()->execSqlAsync(
                "DELETE FROM cart_items WHERE account_id = $1",
                [callbackPtr, accountId, items](const drogon::orm::Result &/*result*/) {
                    if (items.empty()) {
                        dbClient()->execSqlAsync("COMMIT", [callbackPtr](const drogon::orm::Result &/*result*/) {
                            Json::Value body;
                            body["message"] = "Cart replaced";
                            sendJson(callbackPtr, drogon::k200OK, std::move(body));
                        }, [callbackPtr](const drogon::orm::DrogonDbException &e) {
                            Json::Value body;
                            body["message"] = "Failed to commit transaction";
                            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                        });
                        return;
                    }

                    // Build bulk insert query
                    std::string query = "INSERT INTO cart_items (account_id, item_id, quantity, price_entry_id) VALUES ";
                    std::vector<std::string> params;
                    int paramIdx = 1;

                    for (Json::Value::ArrayIndex i = 0; i < items.size(); ++i) {
                        const auto &item = items[i];
                        int itemId = item["item_id"].asInt();
                        int quantity = item["quantity"].asInt();
                        std::string priceEntryIdStr = "NULL";
                        if (item.isMember("price_entry_id") && !item["price_entry_id"].isNull()) {
                            priceEntryIdStr = std::to_string(item["price_entry_id"].asInt());
                        }

                        if (i > 0) query += ", ";
                        query += "($" + std::to_string(paramIdx++) + ", $" + std::to_string(paramIdx++) + ", $" + std::to_string(paramIdx++) + ", " + priceEntryIdStr + ")";
                        
                        params.push_back(std::to_string(accountId));
                        params.push_back(std::to_string(itemId));
                        params.push_back(std::to_string(quantity));
                    }

                    auto onInsertSuccess = [callbackPtr](const drogon::orm::Result &/*result*/) {
                        dbClient()->execSqlAsync("COMMIT", [callbackPtr](const drogon::orm::Result &/*result*/) {
                            Json::Value body;
                            body["message"] = "Cart replaced";
                            sendJson(callbackPtr, drogon::k200OK, std::move(body));
                        }, [callbackPtr](const drogon::orm::DrogonDbException &e) {
                            Json::Value body;
                            body["message"] = "Failed to commit transaction";
                            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                        });
                    };

                    auto onInsertError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
                        dbClient()->execSqlAsync("ROLLBACK", [](const drogon::orm::Result &) {}, [](const drogon::orm::DrogonDbException &) {});
                        LOG_ERROR << "Failed to insert cart items: " << e.base().what();
                        Json::Value body;
                        body["message"] = "Failed to replace cart";
                        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                    };

                    auto client = dbClient();
                    if (items.size() == 0) {
                       onInsertSuccess(drogon::orm::Result(nullptr));
                       return;
                    }
                    // Since dynamic parameter count is hard with execSqlAsync variadic templates, we format them safely above because they are just integers
                    // Actually, simpler to construct the query with inline values since we know they are integers and safe from SQL injection
                    std::string safeQuery = "INSERT INTO cart_items (account_id, item_id, quantity, price_entry_id) VALUES ";
                    for (Json::Value::ArrayIndex i = 0; i < items.size(); ++i) {
                        const auto &item = items[i];
                        int itemId = item["item_id"].asInt();
                        int quantity = item["quantity"].asInt();
                        std::string priceEntryIdStr = "NULL";
                        if (item.isMember("price_entry_id") && !item["price_entry_id"].isNull()) {
                            priceEntryIdStr = std::to_string(item["price_entry_id"].asInt());
                        }

                        if (i > 0) safeQuery += ", ";
                        safeQuery += "(" + std::to_string(accountId) + ", " + std::to_string(itemId) + ", " + std::to_string(quantity) + ", " + priceEntryIdStr + ")";
                    }
                    client->execSqlAsync(safeQuery, onInsertSuccess, onInsertError);

                },
                [callbackPtr](const drogon::orm::DrogonDbException &e) {
                    dbClient()->execSqlAsync("ROLLBACK", [](const drogon::orm::Result &) {}, [](const drogon::orm::DrogonDbException &) {});
                    LOG_ERROR << "Failed to delete cart items: " << e.base().what();
                    Json::Value body;
                    body["message"] = "Failed to replace cart";
                    sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                },
                accountId);
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            LOG_ERROR << "Failed to begin transaction: " << e.base().what();
            Json::Value body;
            body["message"] = "Failed to replace cart";
            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
        }
    );
}

void CartController::optimizeCart(const HttpRequestPtr &req, Callback &&callback) const {
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    auto accountIdOpt = getAccountId(req);

    if (!accountIdOpt) {
        Json::Value body;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    // --- Parse query parameters ---
    auto milesStr     = req->getParameter("miles");
    auto originLonStr = req->getParameter("origin_longitude");
    auto originLatStr = req->getParameter("origin_latitude");

    if (milesStr.empty() || originLonStr.empty() || originLatStr.empty()) {
        Json::Value body;
        body["message"] = "Missing required query parameters: miles, origin_longitude, origin_latitude";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    double miles, originLon, originLat;
    try {
        miles     = std::stod(milesStr);
        originLon = std::stod(originLonStr);
        originLat = std::stod(originLatStr);
    } catch (const std::exception &) {
        Json::Value body;
        body["message"] = "Invalid numeric value for miles, origin_longitude, or origin_latitude";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    int accountId = accountIdOpt.value();

    // Fetch every price entry for every item in this account's cart,
    // together with item metadata and store coordinates.
    // We'll pick the cheapest in-range entry per item in C++.
    auto onResult = [callbackPtr, accountId, miles, originLon, originLat](
                        const drogon::orm::Result &result) {
        // Earth radius in miles (equirectangular approximation)
        constexpr double R = 3959.0;
        constexpr double DEG_TO_RAD = M_PI / 180.0;

        double phi1 = originLat * DEG_TO_RAD;
        double lam1 = originLon * DEG_TO_RAD;

        // Group rows by item_id; for each item keep the cheapest in-range entry.
        // We use a map: item_id -> best row index (-1 = none found yet).
        struct BestEntry {
            bool   found        = false;
            double price        = std::numeric_limits<double>::max();
            int    priceEntryId = 0;
            int    storeId      = 0;
            std::string storeName;
        };
        std::map<int, BestEntry> bestPerItem;

        int idx = 0;
        for (const auto &row : result) {
            int itemId = row["item_id"].as<int>();

            // Every row from this query has a price entry and a store.
            double storeLatDeg = row["store_latitude"].as<double>();
            double storeLonDeg = row["store_longitude"].as<double>();
            double price       = row["logged_price"].as<double>();

            // --- Equirectangular distance ---
            double phi2 = storeLatDeg * DEG_TO_RAD;
            double lam2 = storeLonDeg * DEG_TO_RAD;
            double x    = (lam2 - lam1) * std::cos((phi1 + phi2) / 2.0);
            double y    = phi2 - phi1;
            double dist = R * std::sqrt(x * x + y * y);

            if (dist <= miles) {
                auto &best = bestPerItem[itemId];
                if (price < best.price) {
                    best.price  = price;
                    best.found  = true;
                    best.priceEntryId = row["price_entry_id"].as<int>();
                    best.storeId      = row["store_id"].as<int>();
                    best.storeName    = row["store_name"].as<std::string>();
                }
            }
        }

        // Build a second pass: collect item metadata from the result set.
        // We need all distinct items (even those with no in-range price).
        // Use a separate map for item metadata keyed by item_id.
        struct ItemMeta {
            std::string name;
            std::string category;
            std::string imagePath;
            int         quantity = 0;
        };
        std::map<int, ItemMeta> itemMeta;
        for (const auto &row : result) {
            int itemId = row["item_id"].as<int>();
            if (itemMeta.find(itemId) == itemMeta.end()) {
                ItemMeta m;
                m.name      = row["item_name"].as<std::string>();
                m.category  = row["category"].isNull()    ? "" : row["category"].as<std::string>();
                m.imagePath = row["image_path"].isNull()  ? "" : row["image_path"].as<std::string>();
                m.quantity  = row["quantity"].as<int>();
                itemMeta[itemId] = std::move(m);
            }
        }



        Json::Value cart(Json::objectValue);
        cart["account_id"] = accountId;
        Json::Value items(Json::arrayValue);

        for (const auto &[itemId, meta] : itemMeta) {
            Json::Value item;
            item["internal_id"] = itemId;
            item["item_name"]   = meta.name;
            item["category"]    = meta.category;
            item["image_url"]   = meta.imagePath;
            item["quantity"]    = meta.quantity;

            auto it = bestPerItem.find(itemId);
            if (it != bestPerItem.end() && it->second.found) {
                const auto &best = it->second;
                item["price"]      = best.price;
                item["price_entry_id"] = best.priceEntryId;
                item["store_id"]   = best.storeId;
                item["store_name"] = best.storeName;
            } else {
                item["price"]      = Json::Value(Json::nullValue);
                item["price_entry_id"] = Json::Value(Json::nullValue);
                item["store_id"]   = Json::Value(Json::nullValue);
                item["store_name"] = Json::Value(Json::nullValue);
            }
            items.append(item);
        }
        cart["items"] = items;
        sendJson(callbackPtr, drogon::k200OK, std::move(cart));
    };

    auto onError = [callbackPtr](const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to load optimized cart: " << e.base().what();
        Json::Value body;
        body["message"] = "Failed to load optimized cart";
        sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
    };

    // For each cart item, fetch ALL price entries (across all stores) so we
    // can filter and rank them in C++. Items with no price entries at all
    // will not appear as rows; we handle that via itemMeta population above.
    dbClient()->execSqlAsync(
        "SELECT i.item_id, i.item_name, i.category, i.image_path, "
        "ci.quantity, "
        "pe.entry_id AS price_entry_id, pe.logged_price, "
        "s.store_id, s.name AS store_name, "
        "CAST(s.latitude  AS double precision) AS store_latitude, "
        "CAST(s.longitude AS double precision) AS store_longitude "
        "FROM cart_items ci "
        "JOIN items i ON ci.item_id = i.item_id "
        "JOIN price_entries pe ON pe.item_id = i.item_id "
        "JOIN stores s ON pe.store_id = s.store_id "
        "WHERE ci.account_id = $1 "
        "ORDER BY i.item_id, pe.logged_price",
        onResult, onError, accountId);
}

} // namespace api
