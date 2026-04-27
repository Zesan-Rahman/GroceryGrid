import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { type CatalogReportEntry } from "../api/reports";
import NavBar from "../components/NavBar";

export default function StoreCatalogPage() {
  const { storeId } = useParams<{ storeId: string }>();

  const [storeCatalog, setStoreCatalog] = useState<CatalogReportEntry[] | null>(null);
  const [error, setError] = useState("");

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


  return (
    <>
      <NavBar />
      <main className="standard-page">
        <h1>Store Catalog</h1>
        {error && <p className="status-error">{error}</p>}
        {storeCatalog ? (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Last Updated</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {storeCatalog.map((item) => (
                <tr key={item.entry_id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.last_updated}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/items/${item.item_id}`}>View Details</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Loading...</p>
        )}
      </main>
    </>
  );
}
