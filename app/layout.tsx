import type { Metadata } from "next";
import "./globals.css";
import "./cart.css";
import "./catalog.css";
import "./winnie-product.css";
import "./custom-topper.css";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: {
    default: "UDESIGN PROJECTS STUDIO | Designed by you, made to be yours",
    template: "%s | UDESIGN PROJECTS STUDIO",
  },
  description: "Custom signage, thoughtful gifts and celebration pieces made personal by UDESIGN PROJECTS STUDIO in Malaysia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
