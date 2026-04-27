import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { getCart, getOptimizedCart, replaceCart, type Cart, type CartItem } from "../api/cart";
import "./OptimizedCartPage.css";

export default function OptimizedCartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const miles = Number(searchParams.get("miles")) || 5;
  const lat = Number(searchParams.get("lat")) || 0;
  const lng = Number(searchParams.get("lng")) || 0;

  const [originalCart, setOriginalCart] = useState<Cart | null>(null);
  const [optimizedCart, setOptimizedCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // itemId -> true if using optimized, false if using original
  const [selections, setSelections] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCart(),
      getOptimizedCart(miles, lat, lng)
    ])
      .then(([orig, opt]) => {
        setOriginalCart(orig);
        setOptimizedCart(opt);

        // Default to optimized if available, otherwise original
        const initialSelections: Record<number, boolean> = {};
        for (const item of orig.items) {
          const optItem = opt.items.find(i => i.internal_id === item.internal_id);
          initialSelections[item.internal_id] = !!(optItem && optItem.price_entry_id != null);
        }
        setSelections(initialSelections);
        setError("");
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [miles, lat, lng]);

  async function handleSave() {
    if (!originalCart || !optimizedCart) return;

    setSaving(true);
    try {
      const itemsToSave = originalCart.items.map(origItem => {
        const useOpt = selections[origItem.internal_id];
        const optItem = optimizedCart.items.find(i => i.internal_id === origItem.internal_id);

        let priceEntryId = origItem.price_entry_id;
        if (useOpt && optItem && optItem.price_entry_id != null) {
          priceEntryId = optItem.price_entry_id;
        }

        return {
          item_id: origItem.internal_id,
          quantity: origItem.quantity,
          price_entry_id: priceEntryId
        };
      });

      await replaceCart(itemsToSave);
      navigate("/cart");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSelection(itemId: number, useOptimized: boolean) {
    setSelections(prev => ({
      ...prev,
      [itemId]: useOptimized
    }));
  }

  function renderItemChoice(origItem: CartItem, optItem?: CartItem) {
    const useOpt = selections[origItem.internal_id];

    const hasDeal = !!(optItem && optItem.price_entry_id != null);

    return (
      <tr key={origItem.internal_id}>
        <td className="item-info-cell">
          <strong>{origItem.item_name}</strong>
          <span>Qty: {origItem.quantity}</span>
        </td>

        {/* Original */}
        <td className={`choice-cell is-original ${!useOpt ? "selected" : ""}`}>
          <label>
            <input
              type="radio"
              className="choice-radio"
              name={`item-${origItem.internal_id}`}
              checked={!useOpt}
              onChange={() => toggleSelection(origItem.internal_id, false)}
            />
            <div className="price-box">
              <span className="price-value">
                {origItem.price != null ? `$${origItem.price.toFixed(2)}` : "—"}
              </span>
              <span className="store-name-small">{origItem.store_name || "Unknown Store"}</span>
            </div>
          </label>
        </td>

        {/* Optimized */}
        <td className={`choice-cell is-optimized ${useOpt ? "selected" : ""} ${!hasDeal ? "is-disabled" : ""}`}>
          {hasDeal ? (
            <label>
              <input
                type="radio"
                className="choice-radio"
                name={`item-${origItem.internal_id}`}
                checked={useOpt}
                onChange={() => toggleSelection(origItem.internal_id, true)}
              />
              <div className="price-box">
                <span className="price-value">${optItem!.price!.toFixed(2)}</span>
                <span className="store-name-small">{optItem!.store_name}</span>
                {origItem.price != null && optItem!.price! < origItem.price && (
                  <span className="savings-badge">
                    Save ${(origItem.price - optItem!.price!).toFixed(2)}!
                  </span>
                )}
              </div>
            </label>
          ) : (
            <span className="no-deal-msg">No deals within {miles} miles</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <NavBar />
      <main className="wide-page">
        <div className="optimized-cart-container">
          <h1 className="title">Deal Finder</h1>
          <p className="sub">We've found better prices at stores within <strong>{miles} miles</strong> of your location.</p>

          {loading ? (
            <div className="loading-state">
              <p>Scanning the neighborhood for better prices...</p>
            </div>
          ) : error ? (
            <p className="errorText">Error: {error}</p>
          ) : originalCart && optimizedCart ? (
            <>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Original Cart</th>
                    <th>Best Deal</th>
                  </tr>
                </thead>
                <tbody>
                  {originalCart.items.map(origItem => {
                    const optItem = optimizedCart.items.find(i => i.internal_id === origItem.internal_id);
                    return renderItemChoice(origItem, optItem);
                  })}
                </tbody>
              </table>

              {originalCart.items.length === 0 && (
                <div className="empty-state">
                  <p>Your cart is empty.</p>
                </div>
              )}

              <div className="footer-actions">
                <button
                  className="button-secondary"
                  onClick={() => navigate("/cart")}
                >
                  Cancel
                </button>
                <button
                  className="main-action-btn"
                  onClick={handleSave}
                  disabled={saving || originalCart.items.length === 0}
                >
                  {saving ? "Saving..." : "Save Cart"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
