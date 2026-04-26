export interface PriceHistoryEntry {
  entry_id: number;
  store_id: number | null;
  store_name: string | null;
  logged_price: number;
  upload_date: string;
  price_date: string;
}

export async function getPriceHistory(
  itemId: number,
): Promise<PriceHistoryEntry[]> {
  const res = await fetch(`/api/items/${itemId}/price-history`, {
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Failed to load price history");
  }
  return res.json() as Promise<PriceHistoryEntry[]>;
}
