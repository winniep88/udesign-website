"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { catalog as bundledCatalog, findProduct, findVariant, type Brand, type CatalogProduct } from "@/lib/catalog";
import { normaliseTopperSelection, topperProductName, type TopperCartSelection, type TopperPricing } from "@/lib/topper";

export type CartBrand = Brand;
export type ReferenceImage = { id: string; url: string; name: string };

export type CartItem = {
  id: string;
  brand: CartBrand;
  product: string;
  productId?: string;
  variantId?: string;
  topper?: TopperCartSelection;
  referenceImage?: ReferenceImage;
  quantity: number;
  notes: string;
};

type NewCartItem = Pick<CartItem, "brand" | "product" | "quantity" | "notes" | "productId" | "variantId" | "topper" | "referenceImage">;

type CartContextValue = {
  items: CartItem[];
  catalog: CatalogProduct[];
  topperPrices: TopperPricing | null;
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

function normaliseReferenceImage(value: unknown): ReferenceImage | undefined {
  if (!value || typeof value !== "object" || typeof window === "undefined") return undefined;
  const image = value as Partial<ReferenceImage>;
  if (typeof image.id !== "string" || !/^\d{4}-\d{2}-\d{2}-[0-9a-f-]{36}$/.test(image.id)) return undefined;
  if (typeof image.name !== "string" || !image.name.trim() || image.name.length > 150) return undefined;
  if (typeof image.url !== "string" || image.url.length > 300) return undefined;
  try {
    const url = new URL(image.url, window.location.origin);
    if (url.origin !== window.location.origin || url.search || url.hash || url.pathname !== `/api/reference/${image.id}/`) return undefined;
    return { id: image.id, url: url.pathname, name: image.name.replace(/\s+/g, " ").trim() };
  } catch {
    return undefined;
  }
}

function readStoredCart(value: string | null, products: CatalogProduct[]): CartItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 50).flatMap((entry): CartItem[] => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Partial<CartItem>;
      if (typeof item.id !== "string" || typeof item.quantity !== "number") return [];
      const product = typeof item.productId === "string" ? findProduct(item.productId, products) : undefined;
      const variant = product && typeof item.variantId === "string"
        ? findVariant(product.id, item.variantId, products)
        : undefined;
      const topper = item.topper === undefined ? undefined : normaliseTopperSelection(item.topper);
      if (item.topper !== undefined && !topper) return [];
      if (topper && item.productId) return [];
      if (item.productId && (!product || !variant)) return [];
      if (!product && !topper && (
        (item.brand !== "moments" && item.brand !== "winnie") ||
        typeof item.product !== "string" || !item.product.trim()
      )) return [];
      const referenceImage = normaliseReferenceImage(item.referenceImage);
      return [{
        id: item.id,
        brand: topper ? "winnie" : product?.brand ?? item.brand as CartBrand,
        product: topper ? topperProductName() : product?.name ?? item.product!.trim().slice(0, 100),
        ...(product && variant ? { productId: product.id, variantId: variant.id } : {}),
        ...(topper ? { topper } : {}),
        ...(referenceImage ? { referenceImage } : {}),
        quantity: normaliseQuantity(item.quantity),
        notes: typeof item.notes === "string" ? item.notes.slice(0, 1000) : "",
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
  const [catalog, setCatalog] = useState<CatalogProduct[]>(bundledCatalog);
  const [topperPrices, setTopperPrices] = useState<TopperPricing | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let currentCatalog = bundledCatalog;
    const catalogRequest = fetch("/api/catalog/", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Catalog unavailable");
      const data = await response.json();
      if (!Array.isArray(data.products)) throw new Error("Catalog unavailable");
      return data.products as CatalogProduct[];
    }).then((products) => { currentCatalog = products; }).catch(() => {});
    const pricingRequest = fetch("/api/topper-prices/", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Topper prices unavailable");
      const data = await response.json();
      if (typeof data.prices !== "object" || !data.prices) throw new Error("Topper prices unavailable");
      return data.prices as TopperPricing;
    }).then((prices) => { if (active) setTopperPrices(prices); }).catch(() => {});
    Promise.all([catalogRequest, pricingRequest]).finally(() => {
      if (!active) return;
      setCatalog(currentCatalog);
      try { setItems(readStoredCart(localStorage.getItem(STORAGE_KEY), currentCatalog)); }
      catch { setItems([]); }
      setReady(true);
    });

    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setItems(readStoredCart(event.newValue, currentCatalog));
    }
    window.addEventListener("storage", syncFromAnotherTab);
    return () => { active = false; window.removeEventListener("storage", syncFromAnotherTab); };
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
    catalog,
    topperPrices,
    count: items.reduce((total, item) => total + item.quantity, 0),
    ready,
    addItem: (item) => setItems((current) => {
      const product = item.productId ? findProduct(item.productId, catalog) : undefined;
      const variant = product && item.variantId ? findVariant(product.id, item.variantId, catalog) : undefined;
      const topper = item.topper === undefined ? undefined : normaliseTopperSelection(item.topper);
      if (item.topper !== undefined && !topper) return current;
      if (topper && item.productId) return current;
      if (item.productId && (!product || !variant || !variant.available)) return current;
      const referenceImage = normaliseReferenceImage(item.referenceImage);
      return [...current, {
        id: makeId(),
        brand: topper ? "winnie" : product?.brand ?? item.brand,
        product: topper ? topperProductName() : product?.name ?? item.product.trim().slice(0, 100),
        ...(product && variant ? { productId: product.id, variantId: variant.id } : {}),
        ...(topper ? { topper } : {}),
        ...(referenceImage ? { referenceImage } : {}),
        quantity: normaliseQuantity(item.quantity),
        notes: item.notes.trim().slice(0, 1000),
      }];
    }),
    setQuantity: (id, quantity) => setItems((current) => current.map((item) =>
      item.id === id ? { ...item, quantity: normaliseQuantity(quantity) } : item,
    )),
    setNotes: (id, notes) => setItems((current) => current.map((item) =>
      item.id === id ? { ...item, notes: notes.slice(0, 1000) } : item,
    )),
    removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
    clearCart: () => setItems([]),
  }), [items, catalog, topperPrices, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
