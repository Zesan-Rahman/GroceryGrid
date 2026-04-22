#include "StoreSearchController.h"

#include <drogon/drogon.h>

#include <iostream>
#include <nlohmann/json.hpp>

using namespace drogon;
using namespace drogon::orm;

static const std::string allowedOriginRoute =
    std::getenv("ALLOWED_ORIGIN") ? std::getenv("ALLOWED_ORIGIN") : "http://localhost:5173";

void StoreController::search(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
    std::string query = req->getParameter("q");

    auto dbClient = app().getDbClient();
    std::string sql =
        "SELECT name, address FROM stores "
        "WHERE name ILIKE $1 OR address ILIKE $1";
    std::string param = "%" + query + "%";

    dbClient->execSqlAsync(
        sql,
        [callback](const Result& r) {
            nlohmann::json jsonArray = nlohmann::json::array();
            for (auto row : r) {
                nlohmann::json store;
                store["name"] = row["name"].as<std::string>();
                store["address"] = row["address"].as<std::string>();
                jsonArray.push_back(store);
            }
            auto resp = HttpResponse::newHttpResponse();
            resp->setStatusCode(k200OK);
            resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
            resp->addHeader("Content-Type", "application/json");
            resp->setBody(jsonArray.dump());
            callback(resp);
        },
        [callback](const DrogonDbException& e) {
            std::cout << "DB error: " << e.base().what() << std::endl;
            auto resp = HttpResponse::newHttpResponse();
            resp->setStatusCode(k500InternalServerError);
            resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
            resp->setBody("{\"error\":\"Database error\"}");
            callback(resp);
        },
        param);
}

void StoreController::options(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
    auto resp = HttpResponse::newHttpResponse();
    resp->setStatusCode(k200OK);
    resp->addHeader("Access-Control-Allow-Origin", allowedOriginRoute);
    resp->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
    callback(resp);
}
