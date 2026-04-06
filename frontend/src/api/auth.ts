export type Role = "user" | "store_owner" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface AuthSuccessResponse {
  success: true;
  user: AuthUser;
  message?: string;
}

interface AuthErrorResponse {
  success: false;
  message?: string;
}

type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json()) as AuthResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.message ?? "Request failed");
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await request<AuthSuccessResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return data.user;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await request<AuthSuccessResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  return data.user;
}

export async function me(): Promise<AuthUser> {
  const data = await request<AuthSuccessResponse>("/api/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await request<AuthSuccessResponse>("/api/auth/logout", {
    method: "POST",
  });
}
