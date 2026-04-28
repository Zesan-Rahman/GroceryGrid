import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  deleteReportedEntry,
  dismissReportedEntry,
  getOpenReportEntry,
  type OpenReportEntryDetails,
} from "../api/reports";
import NavBar from "../components/NavBar";

export default function AdminReportEntryPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<OpenReportEntryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState<"delete" | "dismiss" | null>(null);

  useEffect(() => {
    async function loadEntry() {
      if (!entryId) {
        setError("Entry id is missing");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextEntry = await getOpenReportEntry(Number(entryId));
        setEntry(nextEntry);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load entry reports",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadEntry();
  }, [entryId]);

  async function handleDelete() {
    if (!entry) {
      return;
    }

    setActiveAction("delete");
    setError("");
    try {
      await deleteReportedEntry(entry.entry_id);
      navigate("/admin/home", {
        replace: true,
        state: { statusMessage: "Entry deleted and all reports were resolved." },
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to delete entry");
      setActiveAction(null);
    }
  }

  async function handleDismiss() {
    if (!entry) {
      return;
    }

    setActiveAction("dismiss");
    setError("");
    try {
      await dismissReportedEntry(entry.entry_id);
      navigate("/admin/home", {
        replace: true,
        state: { statusMessage: "All reports for this entry were dismissed." },
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to dismiss reports");
      setActiveAction(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="admin-page">
        <h1>Review Reported Entry</h1>
        <p><Link to="/admin/home">Back to Reports</Link></p>
        {error ? <p className="status-error">{error}</p> : null}
        {loading ? <p>Loading entry details...</p> : null}
        {!loading && entry ? (
          <section className="admin-entry-review">
            <div className="admin-report-card">
              <p><strong>Store:</strong> {entry.store_name}</p>
              <p><strong>Item:</strong> {entry.item_name}</p>
              <p><strong>Reported price:</strong> ${entry.reported_price.toFixed(2)}</p>
              <p><strong>Open reports:</strong> {entry.reports.length}</p>
            </div>

            <div className="admin-report-list">
              {entry.reports.map((report) => (
                <article key={report.report_id} className="admin-report-card">
                  <p>
                    <strong>Reported by:</strong>{" "}
                    {report.reporter_name ||
                      report.reporter_email ||
                      (report.reporter_account_id !== null
                        ? `Account #${report.reporter_account_id}`
                        : "Unknown user")}
                  </p>
                  {report.reporter_name && report.reporter_email ? (
                    <p><strong>Email:</strong> {report.reporter_email}</p>
                  ) : null}
                  <p><strong>Reason:</strong> {report.reason}</p>
                  <p><strong>Submitted:</strong> {report.submitted_at}</p>
                </article>
              ))}
            </div>

            <div className="report-actions">
              <button
                type="button"
                className="textButton"
                disabled={activeAction !== null}
                onClick={() => void handleDelete()}
              >
                {activeAction === "delete" ? "Working..." : "Report is right, remove entry"}
              </button>
              <br />
              <button
                type="button"
                className="textButton"
                disabled={activeAction !== null}
                onClick={() => void handleDismiss()}
              >
                {activeAction === "dismiss" ? "Working..." : "Report is wrong, price is correct"}
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
