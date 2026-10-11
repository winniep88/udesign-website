"use client";

import { useCart } from "@/components/CartProvider";
import { formatRinggit } from "@/lib/catalog";
import { topperChoicePriceSen } from "@/lib/topper";

export function TopperStartingPrice() {
  const { topperPrices } = useCart();
  const price = topperChoicePriceSen(1, "cardstock", "Glitter Black", 10, topperPrices ?? undefined);
  return <>From {price === undefined ? "price to confirm" : formatRinggit(price)}</>;
}
