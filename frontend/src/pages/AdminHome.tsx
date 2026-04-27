import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import type { AuthUser } from "../api/auth";
import { getOpenReportEntries, type OpenReportEntrySummary } from "../api/reports";
import NavBar from "../components/NavBar";
import "./AdminHome.css";

interface AdminHomeProps {
  user: AuthUser | null;
}

export default function AdminHome({ user }: AdminHomeProps) {
  const location = useLocation();
  const [entries, setEntries] = useState<OpenReportEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const statusMessage =
    typeof location.state === "object" &&
      location.state !== null &&
      "statusMessage" in location.state &&
      typeof location.state.statusMessage === "string"
      ? location.state.statusMessage
      : "";

  useEffect(() => {
    async function loadEntries() {
      setLoading(true);
      try {
        const nextEntries = await getOpenReportEntries();
        setEntries(nextEntries);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load report entries",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadEntries();
  }, []);

  return (
    <>
      <NavBar />
      <main className="admin-page">
        <h1>Admin Home</h1>
        <p>Welcome {user?.name || user?.email || "admin"}.</p>
        <br />
        <section className="admin-reports-section">
          <h2>Current Open Reports</h2>
          <br />
          {statusMessage ? <p className="status-success">{statusMessage}</p> : null}
          {error ? <p className="status-error">{error}</p> : null}
          {loading ? <p>Loading reports...</p> : null}
          {!loading && entries.length === 0 ? <p>No open reports.</p> : null}
          {!loading && entries.length > 0 ? (
            <div className="admin-report-list">
              {entries.map((entry) => (
                <article key={entry.entry_id} className="admin-report-card">
                  <p><strong>Store:</strong> {entry.store_name}</p>
                  <p><strong>Item:</strong> {entry.item_name}</p>
                  <p><strong>Reported price:</strong> ${entry.reported_price.toFixed(2)}</p>
                  <p><strong>Open reports:</strong> {entry.report_count}</p>
                  <p><strong>Latest submission:</strong> {entry.last_submitted_at}</p>
                  <Link
                    className="admin-review-link"
                    to={`/admin/reports/entries/${entry.entry_id}`}
                  >
                    Review Entry
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
