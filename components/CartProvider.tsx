"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartBrand = "moments" | "winnie";

export type CartItem = {
  id: string;
  brand: CartBrand;
  product: string;
  quantity: number;
  notes: string;
};

type NewCartItem = Pick<CartItem, "brand" | "product" | "quantity" | "notes">;

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  addItem: (item: NewCartItem) => void;
  setQuantity: (id: string, quantity: number) => void;
  setNotes: (id: string, notes: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "udesign.custom-order-cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

function normaliseQuantity(value: number) {
  return Number.isFinite(value) ? Math.min(99, Math.max(1, Math.trunc(value))) : 1;
}

function readStoredCart(value: string | null): CartItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 50).flatMap((entry): CartItem[] => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Partial<CartItem>;
      if (
        typeof item.id !== "string" ||
        (item.brand !== "moments" && item.brand !== "winnie") ||
        typeof item.product !== "string" ||
        !item.product.trim() ||
        typeof item.quantity !== "number"
      ) return [];
      return [{
        id: item.id,
        brand: item.brand,
        product: item.product.trim().slice(0, 100),
        quantity: normaliseQuantity(item.quantity),
        notes: typeof item.notes === "string" ? item.notes.slice(0, 500) : "",
      }];
    });
  } catch {
    return [];
  }
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setItems(readStoredCart(localStorage.getItem(STORAGE_KEY)));
    } catch {
      setItems([]);
    }
    setReady(true);

    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setItems(readStoredCart(event.newValue));
    }
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // The cart continues to work in this tab if browser storage is unavailable.
    }
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    ready,
    addItem: (item) => setItems((current) => [...current, {
      id: makeId(),
      brand: item.brand,
      product: item.product.trim().slice(0, 100),
      quantity: normaliseQuantity(item.quantity),
      notes: item.notes.trim().slice(0, 500),
    }]),
    setQuantity: (id, quantity) => setItems((current) => current.map((item) =>
      item.id === id ? { ...item, quantity: normaliseQuantity(quantity) } : item,
    )),
    setNotes: (id, notes) => setItems((current) => current.map((item) =>
      item.id === id ? { ...item, notes: notes.slice(0, 500) } : item,
    )),
    removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
    clearCart: () => setItems([]),
  }), [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
