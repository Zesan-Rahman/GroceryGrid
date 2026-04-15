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
