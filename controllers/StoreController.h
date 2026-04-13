#pragma once

#include <drogon/HttpController.h>

namespace api
{
class StoreController : public drogon::HttpController<StoreController>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(StoreController::listStores, "/api/stores", drogon::Get);
    ADD_METHOD_TO(StoreController::viewCatalog, "/api/stores/{1}/catalog", drogon::Get);
    METHOD_LIST_END

    void listStores(
        const drogon::HttpRequestPtr &req,
        std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

    void viewCatalog(
            const drogon::HttpRequestPtr &req,
            std::function<void(const drogon::HttpResponsePtr &)> &&callback,
            int storeId) const;
};
}  // namespace api
