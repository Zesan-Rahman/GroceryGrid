#pragma once

#include <drogon/HttpController.h>

namespace api {
class CartController : public drogon::HttpController<CartController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(CartController::createCart, "/api/carts", drogon::Post);
  ADD_METHOD_TO(CartController::listCarts, "/api/carts", drogon::Get);
  ADD_METHOD_TO(CartController::getCart, "/api/carts/{1}", drogon::Get);
  ADD_METHOD_TO(CartController::addItem, "/api/carts/{1}/items", drogon::Post);
  ADD_METHOD_TO(CartController::removeItem, "/api/carts/{1}/items/{2}", drogon::Delete);
  METHOD_LIST_END

  void createCart(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

  void listCarts(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

  void getCart(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
      int cartId) const;

  void addItem(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
      int cartId) const;

  void removeItem(
      const drogon::HttpRequestPtr &req,
      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
      int cartId, int itemId) const;
};
} // namespace api
