#pragma once

#include <drogon/HttpController.h>
#include <drogon/drogon.h>

#include <filesystem>

#include "./helpers/receiptUploadHelper.h"

class UploadController : public drogon::HttpController<UploadController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(UploadController::uploadImage, "/api/upload", drogon::Post);
    ADD_METHOD_TO(UploadController::uploadReceipt, "/api/receipts/upload", drogon::Post);
    ADD_METHOD_TO(UploadController::options, "/api/receipts/upload", drogon::Options);
    METHOD_LIST_END

    void uploadImage(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    void uploadReceipt(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void options(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& callback);
};
