import { useEffect, useState } from "react";

import type { AuthUser } from "../api/auth";
import {
  deleteReportedEntry,
  dismissReportedEntry,
  getOpenReports,
  type OpenReport,
} from "../api/reports";
import NavBar from "../components/NavBar";

interface AdminHomeProps {
  user: AuthUser | null;
}

export default function AdminHome({ user }: AdminHomeProps) {
  const [reports, setReports] = useState<OpenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [activeReportId, setActiveReportId] = useState<number | null>(null);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const nextReports = await getOpenReports();
        setReports(nextReports);
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports");
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, []);

  async function handleDelete(reportId: number) {
    setActiveReportId(reportId);
    setStatusMessage("");
    setError("");

    try {
      await deleteReportedEntry(reportId);
      setReports((current) => current.filter((report) => report.report_id !== reportId));
      setStatusMessage("Entry deleted and report resolved.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to resolve report");
    } finally {
      setActiveReportId(null);
    }
  }

  async function handleDismiss(reportId: number) {
    setActiveReportId(reportId);
    setStatusMessage("");
    setError("");

    try {
      await dismissReportedEntry(reportId);
      setReports((current) => current.filter((report) => report.report_id !== reportId));
      setStatusMessage("Report marked as accurate.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to dismiss report");
    } finally {
      setActiveReportId(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="admin-page">
        <h1>Admin Home</h1>
        <p>Welcome {user?.name || user?.email || "admin"}.</p>
        <section className="admin-reports-section">
          <h2>Open Reports</h2>
          {statusMessage ? <p className="status-success">{statusMessage}</p> : null}
          {error ? <p className="status-error">{error}</p> : null}
          {loading ? <p>Loading reports...</p> : null}
          {!loading && reports.length === 0 ? <p>No open reports.</p> : null}
          {!loading && reports.length > 0 ? (
            <div className="admin-report-list">
              {reports.map((report) => (
                <article key={report.report_id} className="admin-report-card">
                  <p><strong>Store:</strong> {report.store_name}</p>
                  <p><strong>Item:</strong> {report.item_name}</p>
                  <p><strong>Reported price:</strong> ${report.reported_price.toFixed(2)}</p>
                  <p><strong>Reason:</strong> {report.reason}</p>
                  <p><strong>Submitted:</strong> {report.submitted_at}</p>
                  <div className="report-actions">
                    <button
                      type="button"
                      disabled={activeReportId === report.report_id}
                      onClick={() => void handleDelete(report.report_id)}
                    >
                      {activeReportId === report.report_id ? "Working..." : "Delete Entry"}
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={activeReportId === report.report_id}
                      onClick={() => void handleDismiss(report.report_id)}
                    >
                      Confirm Accurate
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
