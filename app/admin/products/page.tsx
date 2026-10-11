"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAccount } from "@/components/AccountProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { type Brand, type CatalogProduct } from "@/lib/catalog";
import "../admin.css";
import "./products.css";

type DraftOption = { id: string; name: string; priceRm: string; available: boolean };
type Draft = { id: string; brand: Brand; category: string; name: string; description: string; imageSrc: string; active: boolean; variants: DraftOption[] };

function asDraft(product: CatalogProduct): Draft {
  return { id: product.id, brand: product.brand, category: product.category, name: product.name, description: product.description || "", imageSrc: product.imageSrc || "", active: product.active !== false,
    variants: product.variants.map((item) => ({ id: item.id, name: item.name, priceRm: (item.priceSen / 100).toFixed(2), available: item.available })) };
}

function blankDraft(): Draft {
  const id = `p_${crypto.randomUUID()}`;
  return { id, brand: "moments", category: "Gifts", name: "", description: "", imageSrc: "", active: true,
    variants: [{ id: `${id}:v_${crypto.randomUUID()}`, name: "Standard", priceRm: "", available: true }] };
}

export default function ProductsPage() {
  const { client, user, enabled, loading } = useAccount();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<"all" | Brand>("all");
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState<"checking" | "owner" | "denied">("checking");
  const [message, setMessage] = useState("");

  const ownerFetch = useCallback(async (path: string, method = "GET", payload?: unknown) => {
    if (!client) throw new Error("Please sign in first.");
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Your sign-in has expired. Please sign in again.");
    const response = await fetch(path, { method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "The product could not be saved.");
    return body;
  }, [client]);

  const reload = useCallback(async () => {
    const body = await ownerFetch("/api/admin/catalog/");
    if (!Array.isArray(body.products)) throw new Error("The product list could not be loaded.");
    setProducts(body.products as CatalogProduct[]);
    setAccess("owner");
  }, [ownerFetch]);

  useEffect(() => {
    if (!enabled || !user) return;
    let current = true;
    reload().catch((error) => { if (current) { setAccess("denied"); setMessage((error as Error).message); } });
    return () => { current = false; };
  }, [enabled, user, reload]);

  const visible = useMemo(() => products.filter((item) => (brand === "all" || item.brand === brand) && `${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase())), [products, brand, query]);
  const update = (patch: Partial<Draft>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const updateOption = (id: string, patch: Partial<DraftOption>) => setDraft((current) => current ? { ...current, variants: current.variants.map((item) => item.id === id ? { ...item, ...patch } : item) } : current);

  async function uploadImage(file: File) {
    if (!draft) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage("Choose a PNG, JPG or WebP image under 5 MB."); return; }
    setBusy(true); setMessage("");
    try {
      const session = await client?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch("/api/admin/catalog/image/", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type }, body: file });
      const data = await response.json();
      if (!response.ok || !data.imageSrc) throw new Error(data.error || "Image upload failed.");
      update({ imageSrc: data.imageSrc });
      setMessage("Photo uploaded. Save the product to show it in the shop.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const variants = draft.variants.map((item) => ({ id: item.id, name: item.name.trim(), priceSen: Math.round(Number(item.priceRm) * 100), available: item.available }));
    if (!draft.name.trim() || !draft.category.trim() || !variants.length || variants.some((item) => !item.name || !Number.isInteger(item.priceSen) || item.priceSen <= 0)) { setMessage("Enter a product name, category and a valid price for every option."); return; }
    setBusy(true); setMessage("");
    try {
      await ownerFetch("/api/admin/catalog/", "POST", { ...draft, variants });
      await reload();
      setMessage("Saved. Customers will see this product and its current price when the shop reloads.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="admin-page"><SiteHeader /><main className="shell admin-main">
    <div className="admin-heading"><div><p className="eyebrow">PRIVATE OWNER TOOLS</p><h1>Product editor<span>.</span></h1><p>Manage what customers see in the shop.</p></div><Link href="/admin/">← Back to orders</Link></div>
    {loading || (enabled && user && access === "checking") ? <p role="status">Checking your access…</p> : !enabled ? <section className="admin-notice"><h2>Owner tools are being set up</h2></section> : !user ? <section className="admin-notice"><h2>Sign in first</h2><Link href="/account/">Go to sign in →</Link></section> : access !== "owner" ? <section className="admin-notice"><h2>Owner access required</h2><p>{message}</p></section> : <div className="product-editor">
      <section className="product-editor__list"><div className="admin-section-heading"><div><h2>Products</h2><p>{products.length} listings across your three brands</p></div><button type="button" onClick={() => { setDraft(blankDraft()); setMessage(""); }}>Add product</button></div><p className="product-editor__special"><Link href="/admin/topper-prices/">Edit Custom Cake Topper prices by material and size →</Link></p>
        <div className="admin-filters"><label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product or category" /></label><label>Brand<select value={brand} onChange={(event) => setBrand(event.target.value as "all" | Brand)}><option value="all">All brands</option><option value="projects">Projects</option><option value="moments">Moments</option><option value="winnie">Winnie Cake Topper</option></select></label></div>
        <div className="product-editor__items">{visible.map((item) => <button type="button" key={item.id} className={draft?.id === item.id ? "is-selected" : ""} onClick={() => { setDraft(asDraft(item)); setMessage(""); }}><span>{item.imageSrc ? <img src={item.imageSrc} alt="" /> : <span className="product-editor__placeholder">◆</span>}</span><span><strong>{item.name}</strong><small>{item.brand} · {item.category} · {item.active === false ? "Hidden" : "Visible"}</small></span></button>)}</div>
      </section>
      <section className="product-editor__form">{draft ? <form onSubmit={save}><div className="admin-section-heading"><div><h2>{products.some((item) => item.id === draft.id) ? "Edit product" : "New product"}</h2><p>Changes appear in the shop after saving.</p></div></div>
        <div className="product-editor__fields"><label>Brand<select value={draft.brand} disabled={products.some((item) => item.id === draft.id)} onChange={(event) => update({ brand: event.target.value as Brand })}><option value="projects">UDESIGN Projects</option><option value="moments">UDESIGN Moments</option><option value="winnie">Winnie Cake Topper</option></select></label><label>Category<input required maxLength={100} value={draft.category} onChange={(event) => update({ category: event.target.value })} placeholder="e.g. Wedding" /></label><label className="product-editor__wide">Product name<input required maxLength={200} value={draft.name} onChange={(event) => update({ name: event.target.value })} /></label><label className="product-editor__wide">Description<textarea rows={4} maxLength={2000} value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder="Tell customers what makes this piece special" /></label></div>
        <div className="product-editor__photo"><strong>Product photo</strong>{draft.imageSrc && <img src={draft.imageSrc} alt="Product preview" />}<label>Upload PNG, JPG or WebP (up to 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /></label>{draft.imageSrc && <button type="button" className="product-editor__minor" onClick={() => update({ imageSrc: "" })}>Remove photo</button>}</div>
        <div className="product-editor__options"><div className="admin-section-heading"><div><h3>Options and prices</h3><p>Add each size or colour as an option.</p></div><button type="button" onClick={() => update({ variants: [...draft.variants, { id: `${draft.id}:v_${crypto.randomUUID()}`, name: "", priceRm: "", available: true }] })}>Add option</button></div>{draft.variants.map((item) => <div className="product-editor__option" key={item.id}><label>Option<input required maxLength={200} value={item.name} onChange={(event) => updateOption(item.id, { name: event.target.value })} placeholder="e.g. 15 cm · Gold" /></label><label>Price (RM)<input required type="number" inputMode="decimal" min="0.01" max="10000" step="0.01" value={item.priceRm} onChange={(event) => updateOption(item.id, { priceRm: event.target.value })} /></label><label className="product-editor__check"><input type="checkbox" checked={item.available} onChange={(event) => updateOption(item.id, { available: event.target.checked })} /> Available</label><button type="button" className="product-editor__minor" disabled={draft.variants.length === 1} onClick={() => update({ variants: draft.variants.filter((other) => other.id !== item.id) })}>Remove</button></div>)}</div>
        <label className="product-editor__show"><input type="checkbox" checked={draft.active} onChange={(event) => update({ active: event.target.checked })} /><span><strong>Show this product in the shop</strong><small>Turn off to hide it. Past orders stay intact.</small></span></label>
        <button className="product-editor__save" type="submit" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
      </form> : <div className="product-editor__empty"><h2>Select a product</h2><p>Choose a listing on the left to edit it, or add a new product.</p></div>}</section>
    </div>}
    {message && access === "owner" && <p className="admin-feedback" role="status">{message}</p>}
  </main><SiteFooter /></div>;
}
