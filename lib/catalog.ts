import catalogData from "@/data/catalog.json";

export type Brand = "projects" | "moments" | "winnie";

export type CatalogVariant = {
  id: string;
  name: string;
  priceSen: number;
  available: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  brand: Brand;
  category: string;
  variants: CatalogVariant[];
};

export const catalog = catalogData as CatalogProduct[];

export function productsForBrand(brand: Brand) {
  return catalog.filter((product) => product.brand === brand);
}

export function findProduct(productId: string) {
  return catalog.find((product) => product.id === productId);
}

export function findVariant(productId: string, variantId: string) {
  return findProduct(productId)?.variants.find((variant) => variant.id === variantId);
}

export function productPriceRange(product: CatalogProduct) {
  const available = product.variants.filter((variant) => variant.available);
  const prices = (available.length ? available : product.variants).map((variant) => variant.priceSen);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function formatRinggit(sen: number) {
  return `RM ${(sen / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
