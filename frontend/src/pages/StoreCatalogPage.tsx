import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  submitPriceReport,
  type CatalogReportEntry,
} from "../api/reports";
import NavBar from "../components/NavBar";

export default function StoreCatalogPage() {
  const { storeId } = useParams<{ storeId: string }>();

  const [storeCatalog, setStoreCatalog] = useState<CatalogReportEntry[] | null>(null);
  const [error, setError] = useState("");
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    fetch(`/api/stores/${storeId}/catalog`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load store catalog");
        }

        return res.json();
      })
      .then((data) => setStoreCatalog(data as CatalogReportEntry[]))
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Couldn't load catalog");
      });
  }, [storeId]);

  async function handleSubmitReport(item: CatalogReportEntry) {
    const reason = reportReason.trim();
    if (!reason) {
      setReportError("Please describe why this price looks inaccurate.");
      return;
    }

    setSubmittingReport(true);
    setReportError("");
    setReportSuccess("");

    try {
      await submitPriceReport(item, reason);
      setReportSuccess("Report submitted for admin review.");
      setActiveReportId(null);
      setReportReason("");
    } catch (submitError) {
      setReportError(
        submitError instanceof Error ? submitError.message : "Unable to submit report",
      );
    } finally {
      setSubmittingReport(false);
    }
  }

  function openReport(entryId: number) {
    setActiveReportId(entryId);
    setReportReason("");
    setReportError("");
    setReportSuccess("");
  }

  function closeReport() {
    setActiveReportId(null);
    setReportReason("");
    setReportError("");
  }

  return (
    <>
      <NavBar />
      <main className="catalog-page">
        <h1>Store Catalog</h1>
        {error ? <p className="status-error">{error}</p> : null}
        {reportSuccess ? <p className="status-success">{reportSuccess}</p> : null}
        {storeCatalog ? (
          <div className="catalog-list">
            {storeCatalog.map((item) => (
              <div key={item.entry_id} className="catalog-entry">
                <p className="catalog-entry-name">{item.name}</p>
                <p>${item.price.toFixed(2)}</p>
                <p>Last updated: {item.last_updated}</p>
                <Link to={`/items/${item.item_id}`}>View Item</Link>
                <button
                  type="button"
                  className="report-link-button"
                  onClick={() => openReport(item.entry_id)}
                >
                  Report
                </button>
                {activeReportId === item.entry_id ? (
                  <div className="report-panel">
                    <h2>Report Inaccurate Price</h2>
                    <label htmlFor={`report-reason-${item.entry_id}`}>Reason</label>
                    <textarea
                      id={`report-reason-${item.entry_id}`}
                      rows={4}
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      placeholder="Describe what looks suspicious or inaccurate."
                    />
                    {reportError ? <p className="status-error">{reportError}</p> : null}
                    <div className="report-actions">
                      <button
                        type="button"
                        disabled={submittingReport}
                        onClick={() => void handleSubmitReport(item)}
                      >
                        {submittingReport ? "Submitting..." : "Submit Report"}
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={submittingReport}
                        onClick={closeReport}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </main>
    </>
  );
}
