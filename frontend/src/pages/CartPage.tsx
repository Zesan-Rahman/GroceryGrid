import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import LocationRibbon, { LocationButton } from "../components/LocationRibbon";
import { getCart, removeFromCart, type Cart } from "../api/cart";
import { useLocation } from "../context/LocationContext";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Record<number, boolean>>({});
  
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [miles, setMiles] = useState(5);
  const { location } = useLocation();
  const navigate = useNavigate();

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

        {cart && cart.items.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <button onClick={() => setShowOptimizeModal(true)}>Optimize Cart</button>
          </div>
        )}

        {showOptimizeModal && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <div style={{ backgroundColor: "#fff", padding: "2rem", borderRadius: "8px", maxWidth: "400px", width: "100%", color: "#333" }}>
              <h2>Optimize Cart</h2>
              <p>Find the lowest prices for your items from stores near you.</p>
              
              <div style={{ margin: "1rem 0" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>Search Radius (miles):</label>
                <input 
                  type="number" 
                  value={miles} 
                  onChange={(e) => setMiles(Number(e.target.value))}
                  min="1"
                  max="100"
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </div>

              {!location ? (
                <div style={{ margin: "1rem 0" }}>
                  <p style={{ color: "red", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Location is required to optimize.</p>
                  <LocationButton label="Get Location" />
                </div>
              ) : (
                <p style={{ fontSize: "0.9rem", color: "green", margin: "1rem 0" }}>Location acquired!</p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button onClick={() => setShowOptimizeModal(false)}>Cancel</button>
                <button 
                  disabled={!location}
                  onClick={() => {
                    if (location) {
                      navigate(`/cart/optimized?miles=${miles}&lat=${location.latitude}&lng=${location.longitude}`);
                    }
                  }}
                >
                  Find Deals
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
