"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useAccount } from "@/components/AccountProvider";
import { whatsappLink } from "@/lib/contact";

type SiteHeaderProps = {
  active?: "home" | "projects" | "moments" | "winnie" | "cart";
  light?: boolean;
  sectionPage?: boolean;
};

const links = [
  { href: "/projects/", label: "Projects", key: "projects" },
  { href: "/moments/", label: "Moments", key: "moments" },
  { href: "/winnie-cake-topper/", label: "Winnie Cake Topper", key: "winnie" },
] as const;

export function SiteHeader({ active = "home", light = false, sectionPage = true }: SiteHeaderProps) {
  const { count } = useCart();
  const { enabled, user } = useAccount();
  return (
    <header className={`site-header ${light ? "site-header--light" : ""}`}>
      <div className="site-header__inner shell">
        <Link href="/" className="wordmark" aria-label="UDESIGN PROJECTS STUDIO, home">
          <span className="wordmark__main">UDesign<span className="wordmark__dot">.</span></span>
          <span className="wordmark__sub">PROJECTS STUDIO</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.key}
              className={active === link.key ? "is-active" : ""}
              href={link.href}
              aria-current={active === link.key && sectionPage ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {enabled && <Link className="header-account" href="/account/">{user ? "My account" : "Sign in"}</Link>}
        <Link className={`header-cart ${active === "cart" ? "is-active" : ""}`} href="/cart/" aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`} aria-current={active === "cart" ? "page" : undefined}>
          Cart <span className="header-cart__count">{count}</span>
        </Link>
        <a className="header-contact" href={whatsappLink("Hi UDESIGN, I'd like to ask about your products.")} target="_blank" rel="noopener noreferrer">
          Let&apos;s talk
        </a>
        <details className="mobile-menu">
          <summary aria-label="Open menu"><span></span><span></span></summary>
          <nav aria-label="Mobile navigation">
            <Link href="/">Home</Link>
            {links.map((link) => <Link key={link.key} href={link.href}>{link.label}</Link>)}
            {enabled && <Link href="/account/">{user ? "My account" : "Sign in"}</Link>}
            <Link href="/cart/">Cart ({count})</Link>
            <a href={whatsappLink("Hi UDESIGN, I'd like to ask about your products.")} target="_blank" rel="noopener noreferrer">Contact on WhatsApp</a>
          </nav>
        </details>
      </div>
    </header>
  );
}
