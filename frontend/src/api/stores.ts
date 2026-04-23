export interface StoreHoursEntry {
  open?: string;
  close?: string;
}

export type StoreHours = Record<string, StoreHoursEntry>;

export interface Store {
  store_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  hours: StoreHours;
  parking: string | null;
}

export interface OwnerStore {
  store_id: number;
  name: string;
  address: string;
  website: string | null;
  phone: string | null;
  parking: string | null;
  entry_count: number;
  item_count: number;
}

interface OwnerStoreSuccessResponse {
  success: true;
  message?: string;
  store: OwnerStore;
}

interface OwnerStoreErrorResponse {
  success: false;
  message?: string;
}

type OwnerStoreResponse = OwnerStoreSuccessResponse | OwnerStoreErrorResponse;

async function requestOwnerStore(path: string, init?: RequestInit): Promise<OwnerStoreSuccessResponse> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const statusLabel = response.status ? `(${response.status})` : "";
    throw new Error(
      `Owner store request failed ${statusLabel}`.trim() +
        (text.includes("<html") ? ". The backend may need to be restarted." : ""),
    );
  }

  const data = (await response.json()) as OwnerStoreResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.message ?? "Request failed");
  }

  return data;
}

export async function getStores(): Promise<Store[]> {
  const response = await fetch("/api/stores", {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to load stores");
  }

  return (await response.json()) as Store[];
}

export async function getOwnerStore(): Promise<OwnerStore> {
  const data = await requestOwnerStore("/api/store-owner/store");
  return data.store;
}

export async function updateOwnerStore(payload: {
  name: string;
  website: string;
  phone: string;
  parking: string;
}): Promise<OwnerStore> {
  const data = await requestOwnerStore("/api/store-owner/store", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return data.store;
}
