import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { roleHomePath } from "../utils/routes";

interface NavItem {
  label: string;
  to: string;
}

export default function NavBar() {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  let links: NavItem[] = [
    { label: "About Us", to: "/about" },
    { label: "Contact Us", to: "/contact" },
  ];

  if (role === "user") {
    links = [
      { label: "Home", to: roleHomePath(role) },
      ...links,
      { label: "Contribute", to: "/contribute" },
      { label: "Catalog", to: "/items" },
    ];
  } else if (role === "store_owner") {
    links = [
      { label: "Home", to: roleHomePath(role) },
      ...links,
      { label: "My Store Page", to: "/store/page" },
      { label: "Catalog", to: "/items" },
    ];
  } else if (role === "admin") {
    links = [{ label: "Home", to: roleHomePath(role) }, ...links];
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="nav-bar" aria-label="Primary">
      <div className="nav-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        GroceryGrid
      </div>
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
      <div className="nav-actions">
        {role === "user" && (
          <button type="button" className="nav-cart-btn" onClick={() => navigate("/cart")}>
            My Cart
          </button>
        )}
        {role ? (
          <button type="button" className="nav-logout-btn" onClick={() => void handleLogout()}>
            Logout
          </button>
        ) : (
          <button type="button" className="nav-login-btn" onClick={() => navigate("/login")}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
