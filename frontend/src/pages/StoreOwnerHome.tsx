import { useNavigate } from "react-router-dom";

import type { AuthUser } from "../api/auth";

interface StoreOwnerHomeProps {
  user: AuthUser | null;
  onLogout: () => Promise<void>;
}

export default function StoreOwnerHome({ user, onLogout }: StoreOwnerHomeProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await onLogout();
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <h1>Store Owner Home</h1>
      <p>Welcome {user?.name || user?.email || "store owner"}.</p>
      <button type="button" onClick={() => void handleLogout()}>
        Logout
      </button>
    </main>
  );
}
