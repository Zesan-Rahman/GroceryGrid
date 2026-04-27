import { useState } from "react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className={`nav-bar ${isMenuOpen ? "menu-open" : ""}`} aria-label="Primary">
      <div className="nav-brand" onClick={() => { navigate("/"); closeMenu(); }} style={{ cursor: "pointer" }}>
        GroceryGrid
      </div>

      <button
        className="nav-mobile-toggle"
        onClick={toggleMenu}
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
      >
        <span className="material-icons">{isMenuOpen ? "close" : "menu"}</span>
      </button>

      <div className={`nav-content ${isMenuOpen ? "is-active" : ""}`}>
        <div className="nav-links">
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={closeMenu}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          {role === "user" && (
            <button
              type="button"
              className="nav-cart-btn"
              onClick={() => {
                navigate("/cart");
                closeMenu();
              }}
            >
              <span className="material-icons" style={{ marginRight: "8px", fontSize: "1.2rem" }}>shopping_cart</span>
              My Cart
            </button>
          )}
          {role ? (
            <button
              type="button"
              className="nav-logout-btn"
              onClick={() => {
                void handleLogout();
                closeMenu();
              }}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className="nav-login-btn"
              onClick={() => {
                navigate("/login");
                closeMenu();
              }}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
