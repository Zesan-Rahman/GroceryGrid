import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getPriceHistory } from "../api/items";
import type { PriceHistoryEntry } from "../api/items";
import { addToCart } from "../api/cart";
import { useCart } from "../context/CartContext";
import ReportEntryModal from "./ReportEntryModal";
import "./PriceHistoryModal.css";

interface Props {
  itemId: number;
  itemName: string;
  onClose: () => void;
}

export default function PriceHistoryModal({ itemId, itemName, onClose }: Props) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Maps entry_id -> "idle" | "adding" | "added" | "error"
  const [cartStatus, setCartStatus] = useState<Record<number, string>>({});
  const { cart, refreshCart } = useCart();

  // The entry currently being reported (null = report modal closed)
  const [reportTarget, setReportTarget] = useState<PriceHistoryEntry | null>(null);

  async function handleAddToCart(entryId: number) {
    setCartStatus((prev) => ({ ...prev, [entryId]: "adding" }));
    try {
      await addToCart(itemId, 1, entryId);
      setCartStatus((prev) => ({ ...prev, [entryId]: "added" }));
      void refreshCart();
    } catch {
      setCartStatus((prev) => ({ ...prev, [entryId]: "error" }));
    }
  }

  // Initialize cart status from current cart
  useEffect(() => {
    if (cart && cart.items) {
      const initialStatus: Record<number, string> = {};
      cart.items.forEach((item) => {
        if (item.internal_id === itemId && item.price_entry_id) {
          initialStatus[item.price_entry_id] = "added";
        }
      });
      setCartStatus(initialStatus);
    }
  }, [cart, itemId]);

  // Lazy-load on first render
  useEffect(() => {
    let cancelled = false;
    getPriceHistory(itemId)
      .then((data) => { if (!cancelled) { setHistory(data); setLoading(false); } })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [itemId]);

  // Close on Escape — but only when the report modal is NOT open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !reportTarget) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, reportTarget]);

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  // Group entries by store for a mini sparkline-style summary
  const byStore = history.reduce<Record<string, PriceHistoryEntry[]>>((acc, e) => {
    const key = e.store_name ?? `Store #${e.store_id}`;
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <>
      <div
        className="ph-overlay"
        ref={overlayRef}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label={`Price history for ${itemName}`}
      >
        <div className="ph-modal">
          {/* Header */}
          <div className="ph-header">
            <div className="ph-title-group">
              <span className="ph-label">Price History</span>
              <h2 className="ph-title">{itemName}</h2>
            </div>
            <button className="ph-close-btn" onClick={onClose} aria-label="Close">
              <span className="material-icons">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="ph-body">
            <p>If the main price seems wrong, you can add a historical price entry to your cart.</p>
            {loading ? (
              <div className="ph-spinner-wrap">
                <span className="ph-spinner" />
                <p>Loading price history…</p>
              </div>
            ) : error ? (
              <p className="ph-error">{error}</p>
            ) : history.length === 0 ? (
              <p className="ph-empty">No price history recorded yet.</p>
            ) : (
              <>
                {/* Per-store sections */}
                {Object.entries(byStore).map(([storeName, entries]) => {
                  return (
                    <section key={storeName} className="ph-store-section">
                      <div className="ph-store-header">
                        <h3 className="ph-store-name">
                          {entries[0].store_id ? (
                            <Link
                              to={`/stores/${entries[0].store_id}/catalog`}
                              className="ph-store-link"
                              onClick={onClose}
                            >
                              {storeName}
                            </Link>
                          ) : (
                            storeName
                          )}
                        </h3>
                      </div>

                      <table className="ph-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Price</th>
                            <th>Logged</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e) => {
                            return (
                              <tr key={e.entry_id}>
                                <td>{e.price_date ? new Date(e.price_date).toLocaleDateString() : "—"}</td>
                                <td className="ph-price-cell">
                                  ${e.logged_price.toFixed(2)}
                                </td>
                                <td className="ph-upload-date">
                                  {e.upload_date
                                    ? new Date(e.upload_date).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td>
                                  <div className="ph-actions">
                                    <button
                                      className="ph-action-btn ph-add-cart-btn"
                                      disabled={cartStatus[e.entry_id] === "adding" || cartStatus[e.entry_id] === "added"}
                                      onClick={() => handleAddToCart(e.entry_id)}
                                    >
                                      {cartStatus[e.entry_id] === "adding"
                                        ? "Adding…"
                                        : cartStatus[e.entry_id] === "added"
                                          ? "Added"
                                          : "Add"}
                                    </button>
                                    <button
                                      className="ph-action-btn ph-report-btn"
                                      onClick={() => setReportTarget(e)}
                                    >
                                      Report
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </section>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report modal layers over the price history modal */}
      {reportTarget && (
        <ReportEntryModal
          itemId={itemId}
          itemName={itemName}
          entry={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </>);
}
