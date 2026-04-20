export interface CatalogItemDetails {
  item_id: number;
  name: string;
  category: string;
  price: number;
  last_updated: string;
}

export interface CatalogReportEntry extends CatalogItemDetails {
  entry_id: number;
  store_id: number;
}

export interface OpenReport {
  report_id: number;
  store_name: string;
  item_name: string;
  reported_price: number;
  reason: string;
  submitted_at: string;
}

interface ApiSuccess<T = undefined> {
  success: true;
  message?: string;
  reports?: OpenReport[];
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
        category: entry.category,
        price: entry.price,
        last_updated: entry.last_updated,
      },
      reason,
      resolution_status: "open",
    }),
  });
}

export async function getOpenReports(): Promise<OpenReport[]> {
  const data = await request("/api/reports/open");
  return data.reports ?? [];
}

export async function deleteReportedEntry(reportId: number): Promise<void> {
  await request(`/api/reports/${reportId}/delete-entry`, {
    method: "POST",
  });
}

export async function dismissReportedEntry(reportId: number): Promise<void> {
  await request(`/api/reports/${reportId}/dismiss`, {
    method: "POST",
  });
}
