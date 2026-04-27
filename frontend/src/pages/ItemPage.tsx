import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { addToCart } from "../api/cart";
import { useCart } from "../context/CartContext";
import "./ItemPage.css";

const PriceHistoryModal = lazy(
  () => import("../components/PriceHistoryModal"),
);

interface PriceEntry {
  entry_id: number;
  store_id: number;
  store_name: string;
  receipt_id: number | null;
  logged_price: number;
  upload_date: string;
  price_date: string;
}

interface ItemDetails {
  internal_id: number;
  item_name: string;
  category: string;
  image_url: string;
  price_entries: PriceEntry[];
}

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Maps entry_id -> "idle" | "adding" | "added" | "error"
  const [cartStatus, setCartStatus] = useState<Record<number, string>>({});
  const { cart, refreshCart } = useCart();
  // null = closed; otherwise the item whose history we're showing
  const [historyTarget, setHistoryTarget] = useState<{ id: number; name: string } | null>(null);

  async function handleAddToCart(entryId: number) {
    if (!item) return;
    setCartStatus((prev) => ({ ...prev, [entryId]: "adding" }));
    try {
      await addToCart(item.internal_id, 1, entryId);
      setCartStatus((prev) => {
        const next = { ...prev };
        // Reset any other entries that were previously "added"
        // because the rows overwrite each other in the cart
        Object.keys(next).forEach((id) => {
          const numId = Number(id);
          if (numId !== entryId && next[numId] === "added") {
            next[numId] = "idle";
          }
        });
        next[entryId] = "added";
        return next;
      });
      void refreshCart();
    } catch {
      setCartStatus((prev) => ({ ...prev, [entryId]: "error" }));
    }
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/items/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("Item not found");
        if (!res.ok) throw new Error("Failed to load item");
        return res.json() as Promise<ItemDetails>;
      })
      .then((data) => {
        setItem(data);
        setError("");
      })
      .then(() => {
          // No op to fix type issue if any
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (item && cart && cart.items) {
      const initialStatus: Record<number, string> = {};
      const cartItem = cart.items.find((i) => i.internal_id === item.internal_id);
      if (cartItem && cartItem.price_entry_id) {
        initialStatus[cartItem.price_entry_id] = "added";
      }
      setCartStatus(initialStatus);
    }
  }, [item, cart]);

  return (
    <>
      <NavBar />
      <main className="standard-page">
        <div className="item-page-container">
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : item ? (
            <div className="item-details-card">
              <div className="item-header">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="item-detail-image" />
                ) : (
                  <div className="item-detail-image placeholder-image" />
                )}
                <div className="item-info">
                  <h1>{item.item_name}</h1>
                  <span className="category-badge">{item.category}</span>
                </div>
              </div>

              <div className="price-entries-section">
                <h2>Recent Prices</h2>
                {item.price_entries && item.price_entries.length > 0 ? (
                  <div className="table-responsive">
                    <table className="price-table">
                      <thead>
                        <tr>
                          <th>Store</th>
                          <th>Price</th>
                          <th>Date Logged</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.price_entries.map((entry) => (
                          <tr key={entry.entry_id}>
                            <td>
                              <Link to={`/stores/${entry.store_id}/catalog`} className="store-link">
                                {entry.store_name}
                              </Link>
                            </td>
                            <td className="price-cell">${entry.logged_price.toFixed(2)}</td>
                            <td>{new Date(entry.price_date).toLocaleDateString()}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-btn add-cart-btn"
                                  disabled={cartStatus[entry.entry_id] === "adding" || cartStatus[entry.entry_id] === "added"}
                                  onClick={() => handleAddToCart(entry.entry_id)}
                                >
                                  {cartStatus[entry.entry_id] === "adding"
                                    ? "Adding…"
                                    : cartStatus[entry.entry_id] === "added"
                                    ? "Added ✓"
                                    : cartStatus[entry.entry_id] === "error"
                                    ? "Error — retry"
                                    : "Add to Cart"}
                                </button>
                                <button
                                  className="action-btn history-btn"
                                  onClick={() =>
                                    setHistoryTarget({
                                      id: item.internal_id,
                                      name: item.item_name,
                                    })
                                  }
                                >
                                  View Price History
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-prices-msg">No price history available.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Lazy-loaded price history modal */}
      {historyTarget && (
        <Suspense fallback={null}>
          <PriceHistoryModal
            itemId={historyTarget.id}
            itemName={historyTarget.name}
            onClose={() => setHistoryTarget(null)}
          />
        </Suspense>
      )}
    </>
  );
}
