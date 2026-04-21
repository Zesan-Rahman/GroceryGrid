#pragma once

#include <drogon/HttpController.h>

namespace api
{
class ItemController : public drogon::HttpController<ItemController>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(ItemController::listItems, "/api/items", drogon::Get);
    METHOD_LIST_END

    void listItems(
        const drogon::HttpRequestPtr &req,
        std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;
};
}  // namespace api
