#include "receiptUpload.h"

#include <drogon/HttpController.h>
#include <drogon/drogon.h>

#include <filesystem>

#include "./helpers/receiptUploadHelper.h"

using namespace drogon;
using namespace drogon::orm;

static const std::string allowedOriginRoute =
    std::getenv("ALLOWED_ORIGIN") ? std::getenv("ALLOWED_ORIGIN") : "http://localhost:5173";

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

    // Use multipart parser instead of req->getParameter()
    auto params = parser.getParameters();

    std::string storeName = params.count("storeName") ? params.at("storeName") : "";
    std::string storeAddress = params.count("storeAddress") ? params.at("storeAddress") : "";
    std::string rawImageFile = params.count("rawImageFile") ? params.at("rawImageFile") : "";

    std::cout << "storeName: " << storeName << std::endl;
    std::cout << "storeAddress: " << storeAddress << std::endl;
    std::cout << "rawImageFile: " << rawImageFile << std::endl;

    auto dbClient = app().getDbClient();

    dbClient->execSqlAsync(
        "SELECT store_id FROM stores WHERE name = $1 AND address = $2",
        [dbClient, rawImageFile, callback](const Result& r) {
            if (r.empty()) {
                auto resp = HttpResponse::newHttpResponse();
                resp->setStatusCode(k404NotFound);
                resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                resp->setBody("{\"error\":\"Store not found\"}");
                callback(resp);
                return;
            }

            int storeId = r[0]["store_id"].as<int>();

            dbClient->execSqlAsync(
                "INSERT INTO receipts (store_id, raw_image_file) VALUES ($1, $2)",
                [callback](const Result& r) {
                    auto resp = HttpResponse::newHttpResponse();
                    resp->setStatusCode(k200OK);
                    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                    resp->addHeader("Content-Type", "application/json");
                    resp->setBody("{\"success\":true}");
                    callback(resp);
                },
                [callback](const DrogonDbException& e) {
                    std::cout << "DB error: " << e.base().what() << std::endl;
                    auto resp = HttpResponse::newHttpResponse();
                    resp->setStatusCode(k500InternalServerError);
                    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
                    resp->setBody("{\"error\":\"Failed to insert receipt\"}");
                    callback(resp);
                },
                storeId, rawImageFile);
        },
        [callback](const DrogonDbException& e) {
            std::cout << "DB error: " << e.base().what() << std::endl;
            auto resp = HttpResponse::newHttpResponse();
            resp->setStatusCode(k500InternalServerError);
            resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
            resp->setBody("{\"error\":\"Failed to find store\"}");
            callback(resp);
        },
        storeName, storeAddress);
}

void UploadController::options(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k200OK);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
    callback(resp);
}
