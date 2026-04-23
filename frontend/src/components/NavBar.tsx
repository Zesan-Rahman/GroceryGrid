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

  if (!role) {
    return null;
  }

  let links: NavItem[] = [{ label: "Home", to: roleHomePath(role) }];

  if (role === "user") {
    links = [
      ...links,
      { label: "About Us", to: "/about" },
      { label: "Contact Us", to: "/contact" },
      { label: "Contribute", to: "/contribute" },
      { label: "Catalog", to: "/items" },
    ];
  } else if (role === "store_owner") {
    links = [
      ...links,
      { label: "About Us", to: "/about" },
      { label: "Contact Us", to: "/contact" },
      { label: "My Store Page", to: "/store/page" },
      { label: "Catalog", to: "/items" },
    ];
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="nav-bar" aria-label="Primary">
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
      <div>
        {/* TODO: change this class from nav-logout to nav-cart */}
        {role === "user" && (
          <button type="button" className="nav-logout" onClick={() => navigate("/cart")}>
            My Cart
          </button>
        )}
        <button type="button" className="nav-logout" onClick={() => void handleLogout()}>
          Logout
        </button>
      </div>
    </nav>
  );
}
