import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import NavBar from "../components/NavBar";

interface Item {
  item_id: number;
  name: string;
  category: string;
  price: number;
  last_updated: string;
}

export default function StoreCatalogPage() {
  const { storeId } = useParams<{ storeId: string }>();

  const [ storeCatalog, setStoreCatalog ] = useState<Array<Item> | null>(null);

  useEffect(() => {
    fetch(`/api/stores/${storeId}/catalog`)
      .then((res) => res.json())
      .then((data) => setStoreCatalog(data))
      .catch((err) => {
        console.error(err);
        setError("Couldn't load catalog: " + err);
      });
  }, [ storeId ]);

  return (
    <>
      <NavBar />
      <main>
        <h1>Store Catalog</h1>
        { storeCatalog ? (
          <div>
            { storeCatalog.map((item, index) => (
              <div key={index}>
                <p>{item.name}</p>
                <p>{item.category}</p>
                <p>{item.price}</p>
                <p>Last updated: {item.last_updated}</p>
                <Link to={`/items/${item.item_id}`}>View Item</Link>
                <hr />
              </div>
            ))
            }
          </div>
        ) : (
          <p>Loading...</p>
        ) }
      </main>
    </>
  );
}
