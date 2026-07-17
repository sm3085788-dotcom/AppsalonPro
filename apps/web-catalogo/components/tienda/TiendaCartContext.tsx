'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useBranch } from '@/components/branch/BranchContext';

export interface TiendaCartItem {
  id: string;
  title: string;
  priceAmount: number;
  qty: number;
  imageUri: string | null;
}

interface StoredCart {
  branchId: string | null;
  items: TiendaCartItem[];
}

interface TiendaCartContextValue {
  cartItems: TiendaCartItem[];
  cartCount: number;
  cartSubtotal: number;
  /** true cuando el carrito ya leyó localStorage (evita redirecciones prematuras). */
  cartHydrated: boolean;
  addItem: (
    item: Omit<TiendaCartItem, 'qty'> & { qty?: number },
    maxStock: number,
  ) => { ok: true } | { ok: false; error: string };
  updateQty: (id: string, qty: number, maxStock: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const TiendaCartContext = createContext<TiendaCartContextValue | null>(null);
const CART_STORAGE_KEY = 'appsalon.tienda.cart';

function readStoredCart(): StoredCart {
  if (typeof window === 'undefined') return { branchId: null, items: [] };
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { branchId: null, items: [] };
    const parsed = JSON.parse(raw) as StoredCart;
    return {
      branchId: parsed.branchId ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { branchId: null, items: [] };
  }
}

function writeStoredCart(cart: StoredCart) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function TiendaCartProvider({ children }: { children: ReactNode }) {
  const { selectedBranchId } = useBranch();
  const [cartItems, setCartItems] = useState<TiendaCartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);

  // Carga única desde localStorage; no vaciar por cambios de sucursal en el arranque.
  useEffect(() => {
    const stored = readStoredCart();
    setCartItems(stored.items);
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    writeStoredCart({ branchId: selectedBranchId, items: cartItems });
  }, [cartItems, selectedBranchId, cartHydrated]);

  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + (Number(item.qty) || 0), 0),
    [cartItems],
  );

  const cartSubtotal = useMemo(
    () =>
      Math.round(
        cartItems.reduce(
          (acc, item) => acc + Number(item.priceAmount || 0) * Number(item.qty || 0),
          0,
        ) * 100,
      ) / 100,
    [cartItems],
  );

  const addItem = useCallback(
    (
      item: Omit<TiendaCartItem, 'qty'> & { qty?: number },
      maxStock: number,
    ): { ok: true } | { ok: false; error: string } => {
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      if (!(item.priceAmount > 0)) {
        return { ok: false, error: 'Este producto requiere consultar precio en salón.' };
      }
      if (maxStock < 1) {
        return { ok: false, error: 'Sin existencia en esta sucursal.' };
      }

      let blocked = false;
      setCartItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        const nextQty = (existing?.qty ?? 0) + qty;
        if (nextQty > maxStock) {
          blocked = true;
          return prev;
        }
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, qty: nextQty, priceAmount: item.priceAmount } : i,
          );
        }
        return [
          ...prev,
          {
            id: item.id,
            title: item.title,
            priceAmount: item.priceAmount,
            qty,
            imageUri: item.imageUri,
          },
        ];
      });

      if (blocked) {
        return { ok: false, error: `Solo hay ${maxStock} disponibles.` };
      }
      return { ok: true };
    },
    [],
  );

  const updateQty = useCallback((id: string, qty: number, maxStock: number) => {
    const next = Math.max(1, Math.min(maxStock, Math.floor(qty)));
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: next } : i)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const value = useMemo<TiendaCartContextValue>(
    () => ({
      cartItems,
      cartCount,
      cartSubtotal,
      cartHydrated,
      addItem,
      updateQty,
      removeItem,
      clearCart,
    }),
    [cartItems, cartCount, cartSubtotal, cartHydrated, addItem, updateQty, removeItem, clearCart],
  );

  return (
    <TiendaCartContext.Provider value={value}>{children}</TiendaCartContext.Provider>
  );
}

export function useTiendaCart(): TiendaCartContextValue {
  const ctx = useContext(TiendaCartContext);
  if (!ctx) {
    throw new Error('useTiendaCart debe usarse dentro de TiendaCartProvider');
  }
  return ctx;
}
