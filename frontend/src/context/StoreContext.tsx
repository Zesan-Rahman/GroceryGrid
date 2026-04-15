import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { getStores, type Store } from "../api/stores";
import { useAuth } from "./AuthContext";

interface StoreContextValue {
  stores: Store[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: PropsWithChildren) {
  const { role } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStores() {
    if (role !== "user" && role !== "store_owner") {
      setStores([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const nextStores = await getStores();
      setStores(nextStores);
      setError(null);
    } catch (loadError) {
      setStores([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load stores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStores();
  }, [role]);

  const value = useMemo(
    () => ({
      stores,
      loading,
      error,
      reload: loadStores,
    }),
    [error, loading, stores],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStores() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStores must be used within StoreProvider");
  }

  return context;
}
