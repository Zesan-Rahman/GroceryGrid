export interface CatalogItemDetails {
  item_id: number;
  name: string;
  price: number;
  last_updated: string;
}

export interface CatalogReportEntry extends CatalogItemDetails {
  entry_id: number;
  store_id: number;
}

export interface OpenReportEntrySummary {
  entry_id: number;
  store_name: string;
  item_name: string;
  reported_price: number;
  report_count: number;
  last_submitted_at: string;
}

export interface EntryReport {
  report_id: number;
  reporter_account_id: number | null;
  reporter_name: string | null;
  reporter_email: string | null;
  reason: string;
  submitted_at: string;
}

export interface OpenReportEntryDetails {
  entry_id: number;
  store_name: string;
  item_name: string;
  reported_price: number;
  reports: EntryReport[];
}

interface ApiSuccess<T = undefined> {
  success: true;
  message?: string;
  reports?: OpenReportEntrySummary[];
  entry?: T;
  report?: T;
}

interface ApiFailure {
  success: false;
  message?: string;
}

type ApiResponse<T = undefined> = ApiSuccess<T> | ApiFailure;

async function request<T>(path: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !data.success) {
    throw new Error(data.message ?? "Request failed");
  }

  return data;
}

export async function submitPriceReport(
  entry: CatalogReportEntry,
  reason: string,
): Promise<void> {
  await request("/api/reports", {
    method: "POST",
    body: JSON.stringify({
      price_entry_id: entry.entry_id,
      store_id: entry.store_id,
      item_details: {
        item_id: entry.item_id,
        name: entry.name,
        price: entry.price,
        last_updated: entry.last_updated,
      },
      reason,
      resolution_status: "open",
    }),
  });
}

export async function getOpenReportEntries(): Promise<OpenReportEntrySummary[]> {
  const data = await request("/api/reports/open");
  return data.reports ?? [];
}

export async function getOpenReportEntry(entryId: number): Promise<OpenReportEntryDetails> {
  const data = await request<OpenReportEntryDetails>(`/api/reports/entries/${entryId}`);
  if (!data.entry) {
    throw new Error("Entry details were not returned");
  }

  return data.entry;
}

export async function deleteReportedEntry(entryId: number): Promise<void> {
  await request(`/api/reports/entries/${entryId}/delete-entry`, {
    method: "POST",
  });
}

export async function dismissReportedEntry(entryId: number): Promise<void> {
  await request(`/api/reports/entries/${entryId}/dismiss`, {
    method: "POST",
  });
}
