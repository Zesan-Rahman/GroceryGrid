import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import "./ItemCatalogPage.css";

interface Item {
  internal_id: number;
  item_name: string;
  category: string;
  image_url: string;
}

export default function ItemCatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      let url = "/api/items";
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }

      setLoading(true);
      fetch(url)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch items");
          }
          return res.json();
        })
        .then((data) => {
          setItems(data);
          setError("");
        })
        .catch((err) => {
          console.error(err);
          setError("Couldn't load items: " + err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <>
      <NavBar />
      <main className="item-catalog-container">
        <h1>Item Catalog</h1>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : items.length > 0 ? (
          <div className="items-grid">
            {items.map((item) => (
              <Link to={`/items/${item.internal_id}`} key={item.internal_id} className="item-card">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="item-image" />
                ) : (
                  <div className="item-image placeholder-image" />
                )}
                <p className="item-name">{item.item_name}</p>
                <p className="item-category">{item.category}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p>No items found.</p>
        )}
      </main>
    </>
  );
}
