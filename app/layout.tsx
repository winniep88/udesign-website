import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import "./globals.css";
import "./cart.css";
import "./catalog.css";
import "./winnie-product.css";
import "./custom-topper.css";
import { CartProvider } from "@/components/CartProvider";
import { AccountProvider } from "@/components/AccountProvider";
import "./account.css";

const udesignSerif = Bodoni_Moda({
  subsets: ["latin"],
  weight: "900",
  display: "swap",
  variable: "--font-udesign-serif",
});

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
      <body className={udesignSerif.variable}><AccountProvider><CartProvider>{children}</CartProvider></AccountProvider></body>
    </html>
  );
}
