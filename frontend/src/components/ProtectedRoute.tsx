import { Navigate, Outlet } from "react-router-dom";

import type { AuthUser, Role } from "../api/auth";
import { roleHomePath } from "../utils/routes";

interface ProtectedRouteProps {
  user: AuthUser | null;
  allowedRoles?: Role[];
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
