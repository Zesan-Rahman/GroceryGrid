import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import type { AuthUser, Role } from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps extends PropsWithChildren {
  user: AuthUser | null;
  logout: () => Promise<void>;
}

export function AuthProvider({
  user,
  logout,
  children,
}: AuthProviderProps) {
  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      logout,
    }),
    [logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
