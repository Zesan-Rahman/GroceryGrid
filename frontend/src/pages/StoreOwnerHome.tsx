import type { AuthUser } from "../api/auth";
import NavBar from "../components/NavBar";

interface StoreOwnerHomeProps {
  user: AuthUser | null;
}

export default function StoreOwnerHome({ user }: StoreOwnerHomeProps) {
  return (
    <>
      <NavBar />
      <main>
        <h1>Store Owner Home</h1>
        <p>Welcome {user?.name || user?.email || "store owner"}.</p>
      </main>
    </>
  );
}
