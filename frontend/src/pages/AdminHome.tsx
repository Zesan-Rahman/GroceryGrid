import { useNavigate } from "react-router-dom";

import type { AuthUser } from "../api/auth";

interface AdminHomeProps {
  user: AuthUser | null;
  onLogout: () => Promise<void>;
}

export default function AdminHome({ user, onLogout }: AdminHomeProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await onLogout();
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <h1>Admin Home</h1>
      <p>Welcome {user?.name || user?.email || "admin"}.</p>
      <button type="button" onClick={() => void handleLogout()}>
        Logout
      </button>
    </main>
  );
}
