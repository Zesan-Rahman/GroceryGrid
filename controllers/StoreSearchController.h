#pragma once
#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>

#include <functional>

class StoreController : public drogon::HttpController<StoreController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(StoreController::search, "/api/stores/search", drogon::Get);
    ADD_METHOD_TO(StoreController::options, "/api/stores/search", drogon::Options);
    METHOD_LIST_END
    void search(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void options(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& callback);
};
