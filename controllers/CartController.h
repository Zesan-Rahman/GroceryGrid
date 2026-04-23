#pragma once

#include <drogon/HttpController.h>

namespace api {
class CartController : public drogon::HttpController<CartController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(CartController::getCart,       "/api/cart",           drogon::Get);
  ADD_METHOD_TO(CartController::replaceCart,   "/api/cart",           drogon::Put);
  ADD_METHOD_TO(CartController::optimizeCart,  "/api/cart/optimized", drogon::Get);
  ADD_METHOD_TO(CartController::addItem,       "/api/cart/items",     drogon::Post);
  ADD_METHOD_TO(CartController::removeItem,    "/api/cart/items/{1}", drogon::Delete);
  METHOD_LIST_END

  void getCart(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

  void addItem(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

  void optimizeCart(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

  void replaceCart(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

  void removeItem(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
      int itemId) const;
};
} // namespace api
