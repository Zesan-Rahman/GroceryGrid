import { Navigate, Outlet } from "react-router-dom";

import type { AuthUser, Role } from "../api/auth";

interface ProtectedRouteProps {
  user: AuthUser | null;
  allowedRoles?: Role[];
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

export default function ProtectedRoute({
  user,
  allowedRoles,
}: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return <Outlet />;
}
