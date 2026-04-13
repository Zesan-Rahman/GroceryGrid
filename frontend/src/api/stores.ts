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

let storesCache: Store[] | null = null;
let storesPromise: Promise<Store[]> | null = null;

async function fetchStores(): Promise<Store[]> {
  const response = await fetch("/api/stores", {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to load stores");
  }

  const stores = (await response.json()) as Store[];
  storesCache = stores;
  return stores;
}

export function getCachedStores(): Store[] | null {
  return storesCache;
}

export function prefetchStores(): Promise<Store[]> {
  if (storesCache) {
    return Promise.resolve(storesCache);
  }

  if (!storesPromise) {
    storesPromise = fetchStores().finally(() => {
      storesPromise = null;
    });
  }

  return storesPromise;
}

export async function getStores(): Promise<Store[]> {
  if (storesCache) {
    return storesCache;
  }

  return prefetchStores();
}
