import { useParams } from "react-router-dom";

import NavBar from "../components/NavBar";

export default function StoreCatalogPage() {
  const { storeId } = useParams<{ storeId: string }>();

  return (
    <>
      <NavBar />
      <main>
        <h1>Store Catalog</h1>
        <p>Catalog view for store #{storeId} is not implemented yet.</p>
      </main>
    </>
  );
}
