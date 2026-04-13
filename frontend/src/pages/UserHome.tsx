import type { AuthUser } from "../api/auth";
import NavBar from "../components/NavBar";

interface UserHomeProps {
  user: AuthUser | null;
}

export default function UserHome({ user }: UserHomeProps) {
  return (
    <>
      <NavBar />
      <main>
        <h1>User Home</h1>
        <p>Welcome {user?.name || user?.email || "user"}.</p>
      </main>
    </>
  );
}
