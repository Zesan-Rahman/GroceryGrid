import { useNavigate } from "react-router-dom";

import type { AuthUser } from "../api/auth";

interface UserHomeProps {
  user: AuthUser | null;
  onLogout: () => Promise<void>;
}

export default function UserHome({ user, onLogout }: UserHomeProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await onLogout();
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <h1>User Home</h1>
      <p>Welcome {user?.name || user?.email || "user"}.</p>
      <button type="button" onClick={() => void handleLogout()}>
        Logout
      </button>
    </main>
  );
}
