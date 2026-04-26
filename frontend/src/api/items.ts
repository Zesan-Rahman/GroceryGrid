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

export async function submitEntryReport(
  itemId: number,
  entry: PriceHistoryEntry,
  reason: string,
): Promise<void> {
  const res = await fetch("/api/reports", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price_entry_id: entry.entry_id,
      store_id: entry.store_id,
      item_details: { item_id: itemId },
      reason,
      resolution_status: "open",
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Failed to submit report");
  }
}

export async function checkUserReport(entryId: number): Promise<boolean> {
  const res = await fetch(`/api/reports/entries/${entryId}/check-user`, {
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Failed to check user report");
  }
  const data = await res.json() as { success: boolean; has_reported: boolean };
  return data.has_reported;
}
