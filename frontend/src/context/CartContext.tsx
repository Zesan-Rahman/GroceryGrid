import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { getCart, type Cart } from "../api/cart";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: PropsWithChildren) {
  const { role } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCart() {
    if (role !== "user") {
      setCart(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextCart = await getCart();
      setCart(nextCart);
      setError(null);
    } catch (err) {
      setCart(null);
      setError(err instanceof Error ? err.message : "Unable to load cart");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCart();
  }, [role]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      refreshCart: loadCart,
    }),
    [cart, loading, error],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
