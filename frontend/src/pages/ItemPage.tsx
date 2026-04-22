import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import "./ItemPage.css";

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

  useEffect(() => {
    setLoading(true);
    fetch(`/api/items/${id}`)
      .then((res) => {
        if (res.status === 404) {
          throw new Error("Item not found");
        }
        if (!res.ok) {
          throw new Error("Failed to load item");
        }
        return res.json();
      })
      .then((data) => {
        setItem(data);
        setError("");
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  return (
    <>
      <NavBar />
      <main className="item-page-container">
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
                              <button className="action-btn add-cart-btn" onClick={() => { }}>Add to Cart</button>
                              <button className="action-btn history-btn" onClick={() => { }}>View Price History</button>
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
      </main>
    </>
  );
}
