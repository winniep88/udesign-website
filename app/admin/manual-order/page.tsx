"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAccount } from "@/components/AccountProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatRinggit } from "@/lib/catalog";
import "../admin.css";

type Brand = "projects" | "moments" | "winnie";
type ManualItem = { name: string; brand: Brand; priceRm: string; quantity: number; notes: string };
const blankItem = (): ManualItem => ({ name: "", brand: "winnie", priceRm: "", quantity: 1, notes: "" });
const shippingByRegion = { west: 800, east: 1500, singapore: 2000 } as const;

function toSen(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const amount = Math.round(Number(value) * 100);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export default function ManualOrderPage() {
  const { client, user, enabled, loading } = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<ManualItem[]>([blankItem()]);
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  const [region, setRegion] = useState<keyof typeof shippingByRegion>("west");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [linkedUserId, setLinkedUserId] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  const subtotal = items.reduce((sum, item) => sum + (toSen(item.priceRm) ?? 0) * item.quantity, 0);
  const shipping = fulfilment === "delivery" ? shippingByRegion[region] : 0;

  async function ownerRequest(path: string, method = "GET", body?: unknown) {
    if (!client) throw new Error("Please sign in first.");
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    const response = await fetch(path, { method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "The request could not be completed.");
    return result;
  }

  async function checkAccount() {
    setBusy(true); setMessage(""); setLinkedUserId(""); setVerifiedEmail("");
    try {
      const result = await ownerRequest(`/api/admin/customers/lookup/?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      if (result.userId && result.email) { setLinkedUserId(result.userId); setVerifiedEmail(result.email); setMessage("Verified customer account found. This order can appear in their account history."); }
      else setMessage("No verified account found. You can still save this WhatsApp order without an account link.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  function updateItem(index: number, patch: Partial<ManualItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (items.some((item) => !item.name.trim() || toSen(item.priceRm) === null || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) { setMessage("Check each product name, price and quantity."); return; }
    if (fulfilment === "delivery" && address.trim().length < 10) { setMessage("Enter the delivery address."); return; }
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await ownerRequest("/api/admin/orders/manual/", "POST", {
        customer: { name: name.trim(), email: normalizedEmail, phone: phone.trim() },
        items: items.map((item) => ({ name: item.name.trim(), brand: item.brand, price: toSen(item.priceRm), quantity: item.quantity, notes: item.notes.trim() })),
        fulfilment, region: fulfilment === "delivery" ? region : null,
        address: fulfilment === "delivery" ? address.trim() : null,
        shippingSen: shipping, extraNotes: notes.trim(),
        ...(linkedUserId && verifiedEmail === normalizedEmail ? { userId: linkedUserId } : {}),
      });
      setCreatedId(result.orderId);
      setMessage("WhatsApp order saved as unpaid. Record the payment only after you actually receive it.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="admin-page"><SiteHeader /><main className="shell admin-main">
    <div className="admin-heading"><div><p className="eyebrow">PRIVATE OWNER TOOLS</p><h1>Add a WhatsApp order<span>.</span></h1><p>Keep an order made in chat in the same customer history.</p></div><Link href="/admin/">← Back to orders</Link></div>
    {loading ? <p role="status">Checking your access…</p> : !enabled ? <section className="admin-notice"><h2>Owner tools are being set up</h2></section> : !user ? <section className="admin-notice"><h2>Sign in first</h2><Link href="/account/">Go to sign in →</Link></section> : createdId ? <section className="admin-notice"><h2>Order saved</h2><p>{message}</p><p>Order number: <strong>#{createdId.slice(0, 8).toUpperCase()}</strong></p><Link href="/admin/">Open owner dashboard →</Link></section> : <form className="admin-manual" onSubmit={createOrder}>
      <section className="admin-manual__card"><h2>Customer</h2><div className="admin-manual__grid"><label>Name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" maxLength={150} value={email} onChange={(event) => { setEmail(event.target.value); setLinkedUserId(""); setVerifiedEmail(""); }} /></label><label>WhatsApp / phone<input required type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div><div className="admin-manual__inline"><button type="button" disabled={busy || !email.includes("@") } onClick={() => void checkAccount()}>Check for saved account</button><span>{linkedUserId ? "Verified account found ✓" : "Account link optional"}</span></div></section>
      <section className="admin-manual__card"><h2>Products</h2>{items.map((item, index) => <div className="admin-manual__item" key={index}><div className="admin-manual__grid"><label className="admin-manual__wide">Product or custom request<input required maxLength={200} value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} /></label><label>Brand<select value={item.brand} onChange={(event) => updateItem(index, { brand: event.target.value as Brand })}><option value="projects">UDESIGN Projects</option><option value="moments">UDESIGN Moments</option><option value="winnie">Winnie Cake Topper</option></select></label><label>Price per item (RM)<input required inputMode="decimal" placeholder="25.00" value={item.priceRm} onChange={(event) => updateItem(index, { priceRm: event.target.value })} /></label><label>Quantity<input required type="number" min={1} max={99} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></label><label className="admin-manual__wide">Personalisation or design details<input maxLength={1000} value={item.notes} onChange={(event) => updateItem(index, { notes: event.target.value })} /></label></div>{items.length > 1 && <button type="button" className="admin-manual__minor" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove product</button>}</div>)}<button type="button" onClick={() => setItems((current) => [...current, blankItem()])} disabled={items.length >= 20}>Add another product</button></section>
      <section className="admin-manual__card"><h2>Pickup or delivery</h2><div className="admin-manual__grid"><label>Method<select value={fulfilment} onChange={(event) => setFulfilment(event.target.value as "pickup" | "delivery")}><option value="pickup">Pickup in Kuchai Lama, KL</option><option value="delivery">Delivery</option></select></label>{fulfilment === "delivery" && <><label>Region<select value={region} onChange={(event) => setRegion(event.target.value as keyof typeof shippingByRegion)}><option value="west">West Malaysia · RM8</option><option value="east">East Malaysia · RM15</option><option value="singapore">Singapore · RM20</option></select></label><label className="admin-manual__wide">Full delivery address<textarea required minLength={10} maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} /></label></>}<label className="admin-manual__wide">Internal order note<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div><div className="admin-manual__total"><span>Products {formatRinggit(subtotal)} + delivery {formatRinggit(shipping)}</span><strong>Total {formatRinggit(subtotal + shipping)}</strong></div></section>
      <div className="admin-manual__submit"><p>Saving this order does not collect money. It begins as unpaid.</p><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save WhatsApp order"}</button></div>
    </form>}
    {message && !createdId && <p className="admin-feedback" role="status">{message}</p>}
  </main><SiteFooter /></div>;
}
