#pragma once

#include <drogon/HttpController.h>

namespace api {
class ItemController : public drogon::HttpController<ItemController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(ItemController::listItems, "/api/items", drogon::Get);
  ADD_METHOD_TO(ItemController::getItem, "/api/items/{1}", drogon::Get);
  ADD_METHOD_TO(ItemController::getPriceHistory, "/api/items/{1}/price-history", drogon::Get);
  METHOD_LIST_END

  void listItems(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

  void getItem(const drogon::HttpRequestPtr &req,
               std::function<void(const drogon::HttpResponsePtr &)> &&callback,
               int itemId) const;

  void getPriceHistory(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
      int itemId) const;
};
} // namespace api
