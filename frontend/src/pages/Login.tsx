import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login, type AuthUser } from "../api/auth";
import NavBar from "../components/NavBar";

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

function getHomePath(role: AuthUser["role"]): string {
  if (role === "admin") {
    return "/admin/home";
  }

  if (role === "store_owner") {
    return "/store/home";
  }

  return "/user/home";
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      onLogin(user);
      navigate(getHomePath(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main>
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p>{error}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p>
          Need an account? <Link to="/register">Register</Link>
        </p>
      </main>
    </>
  );
}
