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
std::string getReceiptImagesDir(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>& callback);

void UploadController::uploadImage(const HttpRequestPtr& req,
                                   std::function<void(const HttpResponsePtr&)>&& callback) {
    MultiPartParser fileParser;
    fileParser.parse(req);
    auto file = fileParser.getFiles().back();

    std::string resultJson;

    std::string savedPath = getReceiptImagesDir(req, callback);
    if (savedPath.empty()) {
        errorHandler(callback, "{\"error\":\"failed to get receipt dir: check account?\"}");
        return;
    }
    savedPath += file.getFileName();
    // Save the files into uploads/account_id/
    file.saveAs(savedPath);

    std::string token = sendToTabScanner(savedPath);
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
    if (resultJson.empty())
        errorHandler(callback, "{\"error\":\"failed to get result\"}");
    else
        successHandler(callback, resultJson);
}

void UploadController::uploadReceipt(const HttpRequestPtr& req,
                                     std::function<void(const HttpResponsePtr&)>&& callback) {
    MultiPartParser parser;
    parser.parse(req);
    auto params = parser.getParameters();

    std::string storeName = params.count("storeName") ? params.at("storeName") : "";
    std::string storeAddress = params.count("storeAddress") ? params.at("storeAddress") : "";
    std::string itemsJson = params.count("items") ? params.at("items") : "[]";

    std::string receiptsDir = getReceiptImagesDir(req, callback);
    std::string rawImageFile = params.count("rawImageFile") ? params.at("rawImageFile") : "";
    if (rawImageFile.empty()) {
        errorHandler(callback, "{\"error\":\"failed to get raw image file\"}");
        return;
    }
    // std::cout << "storeName: " << storeName << std::endl;
    // std::cout << "storeAddress: " << storeAddress << std::endl;
    // std::cout << "itemsJson: " << itemsJson << std::endl;

    auto dbClient = app().getDbClient();

    // get store_id
    dbClient->execSqlAsync(
        "SELECT store_id FROM stores WHERE name = $1 AND address = $2",
        [dbClient, rawImageFile, itemsJson, callback](const Result& r) {
            if (r.empty()) {
                errorHandler(callback, "{\"error\":\"Store not found\"}");
                return;
            }

            int storeId = r[0]["store_id"].as<int>();

            // insert receipt, get receipt_id
            dbClient->execSqlAsync(
                "INSERT INTO receipts (store_id, raw_image_file) VALUES ($1, $2) RETURNING receipt_id",
                [dbClient, storeId, itemsJson, callback](const Result& r) {
                    int receiptId = r[0]["receipt_id"].as<int>();

                    // parse items and insert each one
                    auto items = nlohmann::json::parse(itemsJson, nullptr, false);
                    if (items.is_discarded() || !items.is_array()) {
                        errorHandler(callback, "{\"error\":\"Invalid items JSON\"}");
                        return;
                    }

                    auto total = std::make_shared<int>(items.size());
                    auto completed = std::make_shared<int>(0);
                    auto failed = std::make_shared<bool>(false);

                    if (items.empty()) {
                        successHandler(callback, "");
                        return;
                    }

                    for (auto& item : items) {
                        std::string itemName = item.value("descClean", "");
                        double price = item.value("price", 0.0);
                        std::string date = item.value("date", "");

                        // Insert item into items table
                        dbClient->execSqlAsync(
                            "INSERT INTO items (item_name) VALUES (LOWER($1)) "
                            "ON CONFLICT (item_name) DO UPDATE SET item_name = EXCLUDED.item_name "
                            "RETURNING item_id",
                            [dbClient, storeId, receiptId, price, date, total, completed, failed,
                             callback](const Result& r) {
                                if (*failed) return;
                                int itemId = r[0]["item_id"].as<int>();

                                // Insert price entry
                                if (date.empty()) {
                                    dbClient->execSqlAsync(
                                        "INSERT INTO price_entries (item_id, store_id, receipt_id, "
                                        "logged_price, "
                                        "price_date) "
                                        "VALUES ($1, $2, $3, $4, CURRENT_DATE)",
                                        [total, completed, failed, callback](const Result& r) {
                                            (*completed)++;
                                            if (*completed == *total) successHandler(callback, "");
                                        },
                                        [total, completed, failed, callback](const DrogonDbException& e) {
                                            if (*failed) return;
                                            errorHandler(callback, "{\"error\":\"Failed to insert price entry\"}");
                                        },
                                        itemId, storeId, receiptId, price);
                                } else {
                                    dbClient->execSqlAsync(
                                        "INSERT INTO price_entries (item_id, store_id, receipt_id, "
                                        "logged_price, "
                                        "price_date) "
                                        "VALUES ($1, $2, $3, $4, $5::date)",
                                        [total, completed, failed, callback](const Result& r) {
                                            (*completed)++;
                                            if (*completed == *total) successHandler(callback, "");
                                        },
                                        [total, completed, failed, callback](const DrogonDbException& e) {
                                            if (*failed) return;
                                            errorHandler(callback, "{\"error\":\"Failed to insert price entry\"}");
                                        },
                                        itemId, storeId, receiptId, price, date);
                                }
                            },
                            [total, completed, failed, callback](const DrogonDbException& e) {
                                if (*failed) return;
                                *failed = true;
                                std::cout << "items upsert error: " << e.base().what() << std::endl;
                                errorHandler(callback, "{\"error\":\"Failed to upsert item\"}");
                            },
                            itemName);
                    }
                },
                [callback](const DrogonDbException& e) {
                    std::cout << "receipt insert error: " << e.base().what() << std::endl;
                    errorHandler(callback, "{\"error\":\"Failed to insert receipt\"}");
                },
                storeId, rawImageFile);
        },
        [callback](const DrogonDbException& e) {
            std::cout << "store lookup error: " << e.base().what() << std::endl;
            errorHandler(callback, "{\"error\":\"Failed to find store\"}");
        },
        storeName, storeAddress);
}

// Success and error handler functions
void successHandler(std::function<void(const HttpResponsePtr&)> callback, std::string bodyMessage) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k200OK);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->addHeader("Content-Type", "application/json");
    if (bodyMessage.empty())
        resp->setBody("{\"success\":true}");
    else
        resp->setBody(bodyMessage);
    callback(resp);
}

void errorHandler(std::function<void(const HttpResponsePtr&)> callback, std::string bodyMessage) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k500InternalServerError);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    if (bodyMessage.empty())
        resp->setBody("{\"success\":false}");
    else
        resp->setBody(bodyMessage);
    callback(resp);
}

std::string getReceiptImagesDir(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>& callback) {
    std::string lastSavedPath;
    std::string account_id = std::to_string(req->session()->get<int>("account_id"));
    std::string path = std::filesystem::current_path();
    std::string groceryGrid = "GroceryGrid";
    // Set right path for receipt uploads
    size_t found = path.find(groceryGrid);
    if (found != std::string::npos) {
        path = path.substr(0, found + groceryGrid.length());
        lastSavedPath = path + "/uploads/" + account_id + "/";  //+ file.getFileName();
        if (!std::filesystem::exists(lastSavedPath)) std::filesystem::create_directories(lastSavedPath);
        return lastSavedPath;
    } else {
        return "";
    }
}

void UploadController::options(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k200OK);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
    callback(resp);
}
