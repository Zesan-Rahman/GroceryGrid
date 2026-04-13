import type { Role } from "../api/auth";

export function roleHomePath(role: Role): string {
  if (role === "admin") {
    return "/admin/home";
  }

  if (role === "store_owner") {
    return "/store/home";
  }

  return "/user/home";
}
