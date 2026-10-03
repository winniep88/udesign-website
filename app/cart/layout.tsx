import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your cart — UDESIGN custom pieces",
  description: "Review custom pieces from UDESIGN MOMENTS and WINNIE CAKE TOPPER, then choose delivery or pickup in Kuchai Lama, Kuala Lumpur.",
};

export default function CartLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
