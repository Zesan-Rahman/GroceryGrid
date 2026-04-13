import type { AuthUser } from "../api/auth";
import NavBar from "../components/NavBar";

interface AdminHomeProps {
  user: AuthUser | null;
}

export default function AdminHome({ user }: AdminHomeProps) {
  return (
    <>
      <NavBar />
      <main>
        <h1>Admin Home</h1>
        <p>Welcome {user?.name || user?.email || "admin"}.</p>
      </main>
    </>
  );
}
