#include "receiptUpload.h"

#include <drogon/HttpController.h>
#include <drogon/drogon.h>

#include <filesystem>
#include <memory>

#include "./helpers/receiptUploadHelper.h"

using namespace drogon;
using namespace drogon::orm;

static const std::string allowedOriginRoute =
    std::getenv("ALLOWED_ORIGIN") ? std::getenv("ALLOWED_ORIGIN") : "http://localhost:5173";

void successHandler(std::function<void(const HttpResponsePtr&)> callback, std::string bodyMessage);
void errorHandler(std::function<void(const HttpResponsePtr&)> callback, std::string bodyMessage);

void UploadController::uploadImage(const HttpRequestPtr& req,
                                   std::function<void(const HttpResponsePtr&)>&& callback) {
    MultiPartParser fileParser;
    fileParser.parse(req);
    auto files = fileParser.getFiles();

    std::string lastSavedPath;
    std::string resultJson;

    for (auto& file : files) {
        std::string path = std::filesystem::current_path();
        std::string groceryGrid = "GroceryGrid";
        size_t found = path.find(groceryGrid);
        if (found != std::string::npos) {
            path = path.substr(0, found + groceryGrid.length());
            lastSavedPath = path + "/uploads/" + file.getFileName();
            file.saveAs(path + "/uploads/" + file.getFileName());
        } else {
            lastSavedPath = "uploads/" + file.getFileName();
            file.saveAs(lastSavedPath);
        }
    }

    if (!lastSavedPath.empty()) {
        std::string token = sendToTabScanner(lastSavedPath);
        std::cout << "Tabscanner token: " << token << std::endl;
        if (!token.empty()) {
            std::this_thread::sleep_for(std::chrono::seconds(5));
            for (int i = 0; i < 5; i++) {
                resultJson = getTabScannerResult(token);
                std::cout << "Tabscanner result: " << resultJson << std::endl;
                auto json = nlohmann::json::parse(resultJson, nullptr, false);
                if (!json.is_discarded() && json.value("status_code", 0) == 202) {
                    break;
                }
                std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        }
    }
    if (resultJson.empty())
        errorHandler(callback, "failed to get result");
    else
        successHandler(callback);
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k200OK);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->addHeader("Content-Type", "application/json");
    resp->setBody(resultJson.empty() ? "{\"success\":false,\"message\":\"failed to get result\"}" : resultJson);
    callback(resp);
}

void UploadController::uploadReceipt(const HttpRequestPtr& req,
                                     std::function<void(const HttpResponsePtr&)>&& callback) {
    MultiPartParser parser;
    parser.parse(req);
    auto params = parser.getParameters();

    std::string storeName = params.count("storeName") ? params.at("storeName") : "";
    std::string storeAddress = params.count("storeAddress") ? params.at("storeAddress") : "";
    std::string rawImageFile = params.count("rawImageFile") ? params.at("rawImageFile") : "";
    std::string itemsJson = params.count("items") ? params.at("items") : "[]";

    // std::cout << "storeName: " << storeName << std::endl;
    // std::cout << "storeAddress: " << storeAddress << std::endl;
    // std::cout << "itemsJson: " << itemsJson << std::endl;

    auto dbClient = app().getDbClient();

    // Step 1: get store_id
    dbClient->execSqlAsync(
        "SELECT store_id FROM stores WHERE name = $1 AND address = $2",
        [dbClient, rawImageFile, itemsJson, callback](const Result& r) {
            if (r.empty()) {
                auto resp = HttpResponse::newHttpResponse();
                resp->setStatusCode(k404NotFound);
                resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                resp->setBody("{\"error\":\"Store not found\"}");
                callback(resp);
                return;
            }

            int storeId = r[0]["store_id"].as<int>();

            // Step 2: insert receipt, get receipt_id
            dbClient->execSqlAsync(
                "INSERT INTO receipts (store_id, raw_image_file) VALUES ($1, $2) RETURNING receipt_id",
                [dbClient, storeId, itemsJson, callback](const Result& r) {
                    int receiptId = r[0]["receipt_id"].as<int>();

                    // Step 3: parse items and insert each one
                    auto items = nlohmann::json::parse(itemsJson, nullptr, false);
                    if (items.is_discarded() || !items.is_array()) {
                        auto resp = HttpResponse::newHttpResponse();
                        resp->setStatusCode(k500InternalServerError);
                        resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                        resp->setBody("{\"error\":\"Invalid items JSON\"}");
                        callback(resp);
                        return;
                    }

                    auto total = std::make_shared<int>(items.size());
                    auto completed = std::make_shared<int>(0);
                    auto failed = std::make_shared<bool>(false);

                    if (items.empty()) {
                        auto resp = HttpResponse::newHttpResponse();
                        resp->setStatusCode(k200OK);
                        resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                        resp->addHeader("Content-Type", "application/json");
                        resp->setBody("{\"success\":true}");
                        callback(resp);
                        return;
                    }

                    for (auto& item : items) {
                        std::string itemName = item.value("descClean", "");
                        double price = item.value("price", 0.0);
                        std::string date = item.value("date", "");

                        // Step 4: upsert item into items table
                        dbClient->execSqlAsync(
                            "INSERT INTO items (item_name) VALUES ($1) "
                            "ON CONFLICT (item_name) DO UPDATE SET item_name = EXCLUDED.item_name "
                            "RETURNING item_id",
                            [dbClient, storeId, receiptId, price, date, total, completed, failed,
                             callback](const Result& r) {
                                if (*failed) return;
                                int itemId = r[0]["item_id"].as<int>();

                                // Step 5: insert price entry
                                if (date.empty()) {
                                    dbClient->execSqlAsync(
                                        "INSERT INTO price_entries (item_id, store_id, receipt_id, logged_price, "
                                        "price_date) "
                                        "VALUES ($1, $2, $3, $4, CURRENT_DATE)",
                                        [total, completed, failed, callback](const Result& r) {
                                            // ... same success handler
                                        },
                                        [total, completed, failed, callback](const DrogonDbException& e) {
                                            // ... same error handler
                                        },
                                        itemId, storeId, receiptId, price);
                                } else {
                                    dbClient->execSqlAsync(
                                        "INSERT INTO price_entries (item_id, store_id, receipt_id, logged_price, "
                                        "price_date) "
                                        "VALUES ($1, $2, $3, $4, $5::date)",
                                        [total, completed, failed, callback](const Result& r) {
                                            // ... same success handler
                                        },
                                        [total, completed, failed, callback](const DrogonDbException& e) {
                                            // ... same error handler
                                        },
                                        itemId, storeId, receiptId, price, date);
                                }
                            },
                            [total, completed, failed, callback](const DrogonDbException& e) {
                                if (*failed) return;
                                *failed = true;
                                std::cout << "items upsert error: " << e.base().what() << std::endl;
                                auto resp = HttpResponse::newHttpResponse();
                                resp->setStatusCode(k500InternalServerError);
                                resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                                resp->setBody("{\"error\":\"Failed to upsert item\"}");
                                callback(resp);
                            },
                            itemName);
                    }
                },
                [callback](const DrogonDbException& e) {
                    std::cout << "receipt insert error: " << e.base().what() << std::endl;
                    auto resp = HttpResponse::newHttpResponse();
                    resp->setStatusCode(k500InternalServerError);
                    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                    resp->setBody("{\"error\":\"Failed to insert receipt\"}");
                    callback(resp);
                },
                storeId, rawImageFile);
        },
        [callback](const DrogonDbException& e) {
            std::cout << "store lookup error: " << e.base().what() << std::endl;
            auto resp = HttpResponse::newHttpResponse();
            resp->setStatusCode(k500InternalServerError);
            resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
            resp->setBody("{\"error\":\"Failed to find store\"}");
            callback(resp);
        },
        storeName, storeAddress);
}

// Success and error handler functions
void successHandler(std::function<void(const HttpResponsePtr&)> callback, std::string bodyMessage) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k200OK);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->addHeader("Content-Type", "application/json");
    resp->setBody("{\"success\":true}");
    callback(resp);
}

void errorHandler(std::function<void(const HttpResponsePtr&)> callback, std::string bodyMessage) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k500InternalServerError);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->setBody("{\"error\":\"" + message + "\"}");
    callback(resp);
}

void UploadController::options(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k200OK);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
    callback(resp);
}
