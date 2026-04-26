export interface CartItem {
  internal_id: number;
  item_name: string;
  category: string;
  image_url: string;
  quantity: number;
  price: number | null;
  price_entry_id: number | null;
  store_id: number | null;
  store_name: string | null;
}

export interface Cart {
  account_id: number;
  items: CartItem[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function getCart(): Promise<Cart> {
  return request<Cart>("/api/cart");
}

export async function addToCart(
  item_id: number,
  quantity: number = 1,
  price_entry_id?: number | null,
): Promise<void> {
  await request("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({
      item_id,
      quantity,
      ...(price_entry_id != null ? { price_entry_id } : {}),
    }),
  });
}

export async function removeFromCart(item_id: number): Promise<void> {
  await request(`/api/cart/items/${item_id}`, { method: "DELETE" });
}

export async function getOptimizedCart(miles: number, lat: number, lng: number): Promise<Cart> {
  return request<Cart>(`/api/cart/optimized?miles=${miles}&origin_latitude=${lat}&origin_longitude=${lng}`);
}

export async function replaceCart(items: { item_id: number, quantity: number, price_entry_id: number | null }[]): Promise<void> {
  await request("/api/cart", {
    method: "PUT",
    body: JSON.stringify({ items })
  });
}
