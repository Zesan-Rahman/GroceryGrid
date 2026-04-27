import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { getCart, getOptimizedCart, replaceCart, type Cart, type CartItem } from "../api/cart";

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

    return (
      <tr key={origItem.internal_id}>
        <td>
          {origItem.item_name}
          <br />
          <small>Qty: {origItem.quantity}</small>
        </td>
        
        {/* Original */}
        <td style={{ backgroundColor: !useOpt ? "#e6f7ff" : "transparent" }}>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", cursor: "pointer" }}>
            <input 
              type="radio" 
              name={`item-${origItem.internal_id}`} 
              checked={!useOpt}
              onChange={() => toggleSelection(origItem.internal_id, false)}
            />
            <div>
              {origItem.price != null ? `$${origItem.price.toFixed(2)}` : "No price"}
              <br />
              <small>{origItem.store_name || "Unknown Store"}</small>
            </div>
          </label>
        </td>

        {/* Optimized */}
        <td style={{ backgroundColor: useOpt ? "#f6ffed" : "transparent" }}>
          {optItem && optItem.price_entry_id != null ? (
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", cursor: "pointer" }}>
              <input 
                type="radio" 
                name={`item-${origItem.internal_id}`} 
                checked={useOpt}
                onChange={() => toggleSelection(origItem.internal_id, true)}
              />
              <div>
                ${optItem.price!.toFixed(2)}
                <br />
                <small>{optItem.store_name}</small>
                {origItem.price != null && optItem.price! < origItem.price && (
                  <span style={{ color: "green", marginLeft: "0.5rem", fontSize: "0.8rem", fontWeight: "bold" }}>
                    Save ${(origItem.price - optItem.price!).toFixed(2)}!
                  </span>
                )}
              </div>
            </label>
          ) : (
            <span style={{ color: "#999" }}>No deals within {miles} miles</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <NavBar />
      <main className="wide-page">
        <h1>Optimize Cart</h1>
        <p>Comparing prices within {miles} miles of your location.</p>

        {loading ? (
          <p>Finding the best deals...</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : originalCart && optimizedCart ? (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #eee", padding: "0.5rem" }}>Item</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #eee", padding: "0.5rem" }}>Original Cart</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #eee", padding: "0.5rem" }}>Optimized (Best Deal)</th>
                </tr>
              </thead>
              <tbody>
                {originalCart.items.map(origItem => {
                  const optItem = optimizedCart.items.find(i => i.internal_id === origItem.internal_id);
                  return renderItemChoice(origItem, optItem);
                })}
              </tbody>
            </table>

            {originalCart.items.length === 0 && <p>Your cart is empty.</p>}

            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
              <button 
                onClick={() => navigate("/cart")} 
                style={{ backgroundColor: "#ccc", color: "#333" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving || originalCart.items.length === 0}
              >
                {saving ? "Saving..." : "Save Optimized Cart"}
              </button>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
