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
    ];
  } else if (role === "store_owner") {
    links = [
      { label: "Home", to: roleHomePath(role) },
      ...links,
      { label: "My Store Page", to: "/store/page" },
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
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
      {role ? (
        <button type="button" className="nav-logout" onClick={() => void handleLogout()}>
          Logout
        </button>
      ) : (
        <button type="button" className="nav-logout" onClick={() => navigate("/login")}>
          Login
        </button>
      )}
    </nav>
  );
}
