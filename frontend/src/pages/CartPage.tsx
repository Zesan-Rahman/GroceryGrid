import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import LocationRibbon from "../components/LocationRibbon";
import { getCart, removeFromCart, type Cart } from "../api/cart";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLoading(true);
    getCart()
      .then((data) => {
        setCart(data);
        setError("");
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleRemove(itemId: number) {
    setRemoving((prev) => ({ ...prev, [itemId]: true }));
    try {
      await removeFromCart(itemId);
      setCart((prev) =>
        prev
          ? { ...prev, items: prev.items.filter((i) => i.internal_id !== itemId) }
          : prev
      );
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRemoving((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  return (
    <>
      <LocationRibbon />
      <NavBar />
      <main>
        <h1>My Cart</h1>

        {loading ? (
          <p>Loading cart…</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : cart && cart.items.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Store</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.internal_id}>
                  <td>
                    <Link to={`/items/${item.internal_id}`}>{item.item_name}</Link>
                    {item.category && <span> ({item.category})</span>}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{item.price != null ? `$${item.price.toFixed(2)}` : "—"}</td>
                  <td>
                    {item.store_id != null
                      ? <Link to={`/stores/${item.store_id}/catalog`}>{item.store_name}</Link>
                      : "—"}
                  </td>
                  <td>
                    <button
                      disabled={removing[item.internal_id]}
                      onClick={() => handleRemove(item.internal_id)}
                    >
                      {removing[item.internal_id] ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Your cart is empty.</p>
        )}
      </main>
    </>
  );
}
