import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import LocationRibbon, { LocationButton } from "../components/LocationRibbon";
import { removeFromCart } from "../api/cart";
import { useLocation } from "../context/LocationContext";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { cart, loading, error, refreshCart } = useCart();
  const [removing, setRemoving] = useState<Record<number, boolean>>({});
  
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [miles, setMiles] = useState(5);
  const { location } = useLocation();
  const navigate = useNavigate();

  async function handleRemove(itemId: number) {
    setRemoving((prev) => ({ ...prev, [itemId]: true }));
    try {
      await removeFromCart(itemId);
      await refreshCart();
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
      <main className="standard-page">
        <h1>My Cart</h1>

        {loading ? (
          <p>Loading cart…</p>
        ) : error ? (
          <p className="status-error">Error: {error}</p>
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
                    <Link to={`/items/${item.internal_id}`} style={{ fontWeight: 700 }}>{item.item_name}</Link>
                    {item.category && <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}> ({item.category})</span>}
                  </td>
                  <td>{item.quantity}</td>
                  <td style={{ fontWeight: 800, color: "var(--primary)" }}>{item.price != null ? `$${item.price.toFixed(2)}` : "—"}</td>
                  <td>
                    {item.store_id != null
                      ? <Link to={`/user/home?focusStoreId=${item.store_id}`} style={{ color: "inherit" }}>{item.store_name}</Link>
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="button-secondary"
                      style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
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
          <div style={{ marginTop: "2rem", textAlign: "right" }}>
            <button onClick={() => setShowOptimizeModal(true)}>Optimize Cart</button>
          </div>
        )}

        {showOptimizeModal && (
          <div className="modal-overlay" onClick={() => setShowOptimizeModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Optimize Cart</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                Find the lowest prices for your items from stores near you.
              </p>
              
              <div className="form-group" style={{ marginBottom: "2rem" }}>
                <label>Search Radius (miles)</label>
                <input 
                  type="number" 
                  value={miles} 
                  onChange={(e) => setMiles(Number(e.target.value))}
                  min="1"
                  max="100"
                />
              </div>

              {!location ? (
                <div style={{ margin: "1.5rem 0", padding: "1rem", background: "rgba(242, 129, 35, 0.1)", borderRadius: "var(--radius-md)" }}>
                  <p style={{ color: "var(--error)", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                    Location is required to optimize.
                  </p>
                  <LocationButton label="Get Location" />
                </div>
              ) : (
                <p style={{ fontSize: "0.95rem", color: "var(--success)", fontWeight: 700, margin: "1.5rem 0" }}>
                  ✓ Location acquired!
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                <button className="button-secondary" onClick={() => setShowOptimizeModal(false)}>Cancel</button>
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
