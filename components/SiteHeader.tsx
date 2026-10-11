"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useAccount } from "@/components/AccountProvider";
import { whatsappLink } from "@/lib/contact";

type SiteHeaderProps = {
  active?: "home" | "projects" | "moments" | "winnie" | "about" | "cart";
  light?: boolean;
  sectionPage?: boolean;
};

const links = [
  { href: "/projects/", label: "Projects", key: "projects" },
  { href: "/moments/", label: "Moments", key: "moments" },
  { href: "/winnie-cake-topper/", label: "Winnie Cake Topper", key: "winnie" },
  { href: "/about/", label: "About us", key: "about" },
] as const;

export function SiteHeader({ active = "home", light = false, sectionPage = true }: SiteHeaderProps) {
  const { count, catalog } = useCart();
  const { enabled, user } = useAccount();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const results = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query ? catalog.filter((product) => `${product.name} ${product.category} ${product.brand}`.toLocaleLowerCase().includes(query)).slice(0, 8) : [];
  }, [catalog, search]);
  const brandHref = (brand: string, query: string) => `${brand === "winnie" ? "/winnie-cake-topper/" : `/${brand}/`}?q=${encodeURIComponent(query)}#products`;
  return (
    <header className={`site-header ${light ? "site-header--light" : ""}`}>
      {enabled && <div className="promo-banner"><Link href="/account/">New here? Get RM10 off your first order of RM100+ when you sign in <span aria-hidden="true">→</span></Link></div>}
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
        <div className="header-actions">
          <button type="button" className="header-icon" aria-label="Search products" onClick={() => dialogRef.current?.showModal()}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7" /><path d="m16 16 5 5" /></svg></button>
          <Link className="header-icon" href="/account/" aria-label={enabled && user ? "My account" : "Sign in to your account"}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5" /><path d="M4.5 21c.4-4.2 3.2-6.5 7.5-6.5s7.1 2.3 7.5 6.5" /></svg></Link>
        <Link className={`header-cart ${active === "cart" ? "is-active" : ""}`} href="/cart/" aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`} aria-current={active === "cart" ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h2l2.1 10.5h11.8L21 8H6" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg><span className="header-cart__count">{count}</span>
        </Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open menu"><span></span><span></span></summary>
          <nav aria-label="Mobile navigation">
            <Link href="/">Home</Link>
            {links.map((link) => <Link key={link.key} href={link.href}>{link.label}</Link>)}
            <Link href="/account/">{enabled && user ? "My account" : "Sign in"}</Link>
            <Link href="/cart/">Cart ({count})</Link>
            <a href={whatsappLink("Hi UDESIGN, I'd like to ask about your products.")} target="_blank" rel="noopener noreferrer">Contact on WhatsApp</a>
          </nav>
        </details>
      </div>
      <dialog className="header-search" ref={dialogRef} aria-labelledby="header-search-title" onClose={() => setSearch("")}>
        <div className="header-search__top"><h2 id="header-search-title">Find something special</h2><button type="button" aria-label="Close search" onClick={() => dialogRef.current?.close()}>×</button></div>
        <label htmlFor="header-search-input">Search all three brands</label>
        <input id="header-search-input" type="search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try cake topper, wedding gift, logo…" />
        {search.trim() ? <div className="header-search__results">{results.length ? results.map((product) => <Link key={product.id} href={brandHref(product.brand, product.name)} onClick={() => dialogRef.current?.close()}><strong>{product.name}</strong><span>{product.brand} · {product.category}</span></Link>) : <p>No matching products. <a href={whatsappLink(`Hi UDESIGN, I'm looking for ${search.trim()}. Can you help?`)} target="_blank" rel="noopener noreferrer">Ask us on WhatsApp</a></p>}</div> : <p className="header-search__hint">Search products across Projects, Moments and Winnie Cake Topper.</p>}
      </dialog>
    </header>
  );
}
