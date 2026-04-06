import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { logout, me, type AuthUser, type Role } from "./api/auth";
import AdminHome from "./pages/AdminHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StoreOwnerHome from "./pages/StoreOwnerHome";
import UserHome from "./pages/UserHome";

const STORAGE_KEY = "grocery-grid-user";

function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function roleHomePath(role: Role): string {
  if (role === "admin") {
    return "/admin/home";
  }

  if (role === "store_owner") {
    return "/store/home";
  }

  return "/user/home";
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const currentUser = await me();
        if (cancelled) {
          return;
        }

        setUser(currentUser);
        saveUser(currentUser);
      } catch {
        if (cancelled) {
          return;
        }

        setUser(null);
        saveUser(null);
      } finally {
        if (!cancelled) {
          setBootstrapped(true);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogin(nextUser: AuthUser) {
    setUser(nextUser);
    saveUser(nextUser);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Clear local auth state even if the server session is already invalid.
    }

    setUser(null);
    saveUser(null);
  }

  if (!bootstrapped) {
    return <p>Loading...</p>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={user ? roleHomePath(user.role) : "/login"}
            replace
          />
        }
      />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={roleHomePath(user.role)} replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/register"
        element={user ? <Navigate to={roleHomePath(user.role)} replace /> : <Register />}
      />

      <Route element={<ProtectedRoute user={user} allowedRoles={["user"]} />}>
        <Route
          path="/user/home"
          element={<UserHome user={user} onLogout={handleLogout} />}
        />
      </Route>

      <Route
        element={<ProtectedRoute user={user} allowedRoles={["store_owner"]} />}
      >
        <Route
          path="/store/home"
          element={<StoreOwnerHome user={user} onLogout={handleLogout} />}
        />
      </Route>

      <Route element={<ProtectedRoute user={user} allowedRoles={["admin"]} />}>
        <Route
          path="/admin/home"
          element={<AdminHome user={user} onLogout={handleLogout} />}
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={user ? roleHomePath(user.role) : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}
