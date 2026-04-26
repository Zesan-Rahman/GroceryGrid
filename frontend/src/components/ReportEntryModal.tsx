import { useEffect, useRef, useState } from "react";
import type { PriceHistoryEntry } from "../api/items";
import { submitEntryReport } from "../api/items";
import "./ReportEntryModal.css";

interface Props {
  itemId: number;
  itemName: string;
  entry: PriceHistoryEntry;
  onClose: () => void;
}

export default function ReportEntryModal({
  itemId,
  itemName,
  entry,
  onClose,
}: Props) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape (but don't bubble up to the outer modal)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true); // capture phase
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    // should we allow empty reason?
    if (!trimmed) {
      setErrorMsg("Please describe why this price looks inaccurate.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      await submitEntryReport(itemId, entry, trimmed);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to submit report");
      setStatus("error");
    }
  }

  const storeName = entry.store_name ?? `Store #${entry.store_id}`;
  const priceDisplay = `$${entry.logged_price.toFixed(2)}`;
  const dateDisplay = entry.price_date
    ? new Date(entry.price_date).toLocaleDateString()
    : "unknown date";

  return (
    <div
      className="re-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Report price entry"
    >
      <div className="re-modal">
        {/* Header */}
        <div className="re-header">
          <div className="re-title-group">
            <span className="re-label">Report Price</span>
            <h2 className="re-title">{itemName}</h2>
          </div>
          <button className="re-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Entry summary */}
        <div className="re-entry-summary">
          <span className="re-summary-store">{storeName}</span>
          <span className="re-summary-sep">·</span>
          <span className="re-summary-price">{priceDisplay}</span>
          <span className="re-summary-sep">·</span>
          <span className="re-summary-date">{dateDisplay}</span>
        </div>

        {/* Body */}
        {status === "success" ? (
          <div className="re-success">
            <span className="re-success-icon">✓</span>
            <p>Your report has been submitted for admin review.</p>
            <button className="re-btn re-btn--primary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form className="re-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="re-field-label" htmlFor="re-reason">
              Why does this price look incorrect or suspicious?
            </label>
            <textarea
              id="re-reason"
              ref={textareaRef}
              className="re-textarea"
              rows={4}
              placeholder="e.g. Price is much higher than usual, wrong store, duplicate entry…"
              value={reason}
              disabled={status === "submitting"}
              onChange={(e) => setReason(e.target.value)}
            />
            {errorMsg && <p className="re-error">{errorMsg}</p>}
            <div className="re-actions">
              <button
                type="submit"
                className="re-btn re-btn--primary"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Submitting…" : "Submit Report"}
              </button>
              <button
                type="button"
                className="re-btn re-btn--ghost"
                disabled={status === "submitting"}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
