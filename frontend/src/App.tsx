import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { logout, me, type AuthUser } from "./api/auth";
import { StoreProvider } from "./context/StoreContext";
import { LocationProvider } from "./context/LocationContext";
import { CartProvider } from "./context/CartContext";
import AdminHome from "./pages/AdminHome";
import AdminReportEntryPage from "./pages/AdminReportEntryPage";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import Contribute from "./pages/Contribute";
import Login from "./pages/Login";
import MyStorePage from "./pages/MyStorePage";
import Register from "./pages/Register";
import StoreCatalogPage from "./pages/StoreCatalogPage";
import ItemCatalogPage from "./pages/ItemCatalogPage";
import ItemPage from "./pages/ItemPage";
import StoreOwnerHome from "./pages/StoreOwnerHome";
import UserHome from "./pages/UserHome";
import CartPage from "./pages/CartPage";
import OptimizedCartPage from "./pages/OptimizedCartPage";
import { roleHomePath } from "./utils/routes";

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
    <LocationProvider>
      <AuthProvider user={user} logout={handleLogout}>
        <StoreProvider>
          <CartProvider>
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

              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />

              <Route
                element={
                  <ProtectedRoute
                    user={user}
                    allowedRoles={["user", "store_owner", "admin"]}
                  />
                }
              >
                <Route path="/items" element={<ItemCatalogPage />} />
                <Route path="/items/:id" element={<ItemPage />} />
              </Route>

              <Route
                element={<ProtectedRoute user={user} allowedRoles={["user"]} />}
              >
                <Route path="/user/home" element={<UserHome user={user} />} />
                <Route path="/contribute" element={<Contribute />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/cart/optimized" element={<OptimizedCartPage />} />
              </Route>

              <Route
                element={<ProtectedRoute user={user} allowedRoles={["store_owner"]} />}
              >
                <Route path="/store/home" element={<StoreOwnerHome user={user} />} />
                <Route path="/store/page" element={<MyStorePage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    user={user}
                    allowedRoles={["user", "store_owner"]}
                  />
                }
              >
                <Route path="/stores/:storeId/catalog" element={<StoreCatalogPage />} />
              </Route>

              <Route element={<ProtectedRoute user={user} allowedRoles={["admin"]} />}>
                <Route path="/admin/home" element={<AdminHome user={user} />} />
                <Route
                  path="/admin/reports/entries/:entryId"
                  element={<AdminReportEntryPage />}
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
          </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </LocationProvider>
  );
}
