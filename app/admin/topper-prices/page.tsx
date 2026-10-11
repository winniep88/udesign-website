"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAccount } from "@/components/AccountProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { topperSizes, type TopperMaterial, type TopperPricing } from "@/lib/topper";
import "../admin.css";
import "./topper-prices.css";

const materials: { id: TopperMaterial; name: string }[] = [
  { id: "cardstock", name: "Cardstock" }, { id: "acrylic", name: "Acrylic" }, { id: "wood", name: "Wood" },
];
type PriceDraft = Record<TopperMaterial, Record<number, string>>;

function toDraft(prices: TopperPricing): PriceDraft {
  return {
    cardstock: Object.fromEntries(topperSizes.map(({ cm }) => [cm, (prices.cardstock[cm] / 100).toFixed(2)])),
    acrylic: Object.fromEntries(topperSizes.map(({ cm }) => [cm, (prices.acrylic[cm] / 100).toFixed(2)])),
    wood: Object.fromEntries(topperSizes.map(({ cm }) => [cm, (prices.wood[cm] / 100).toFixed(2)])),
  };
}

export default function TopperPricesPage() {
  const { client, user, enabled, loading } = useAccount();
  const [draft, setDraft] = useState<PriceDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [access, setAccess] = useState<"checking" | "owner" | "denied">("checking");

  const ownerFetch = useCallback(async (method = "GET", payload?: unknown) => {
    if (!client) throw new Error("Please sign in first.");
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Your sign-in has expired. Please sign in again.");
    const response = await fetch("/api/admin/topper-prices/", { method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Could not load cake topper prices.");
    return body;
  }, [client]);

  useEffect(() => {
    if (!enabled || !user) return;
    ownerFetch().then((body) => { setDraft(toDraft(body.prices as TopperPricing)); setAccess("owner"); }).catch((error) => { setAccess("denied"); setMessage((error as Error).message); });
  }, [enabled, user, ownerFetch]);

  function change(material: TopperMaterial, size: number, value: string) {
    setDraft((current) => current ? { ...current, [material]: { ...current[material], [size]: value } } : null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const prices = Object.fromEntries(materials.map(({ id }) => [id, Object.fromEntries(topperSizes.map(({ cm }) => [cm, Math.round(Number(draft[id][cm]) * 100)]))])) as Record<TopperMaterial, Record<number, number>>;
    if (materials.some(({ id }) => topperSizes.some(({ cm }) => !Number.isInteger(prices[id][cm]) || prices[id][cm] <= 0))) { setMessage("Enter a valid price for every size."); return; }
    setBusy(true); setMessage("");
    try { await ownerFetch("POST", prices); setMessage("Prices saved. Customers will see the new amounts when the shop reloads."); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="admin-page"><SiteHeader /><main className="shell admin-main">
    <div className="admin-heading"><div><p className="eyebrow">PRIVATE OWNER TOOLS</p><h1>Cake topper prices<span>.</span></h1><p>Set the starting price for each material and size.</p></div><Link href="/admin/products/">← Back to products</Link></div>
    {loading || (enabled && user && access === "checking") ? <p role="status">Checking your access…</p> : !enabled ? <section className="admin-notice"><h2>Owner tools are being set up</h2></section> : !user ? <section className="admin-notice"><h2>Sign in first</h2><Link href="/account/">Go to sign in →</Link></section> : access !== "owner" ? <section className="admin-notice"><h2>Owner access required</h2><p>{message}</p></section> : draft && <form className="topper-price-editor" onSubmit={save}>
      <p>These are the prices customers see when choosing a Custom Cake Topper. The current extra charges for Mirror Rose Gold and Brown wood stay the same.</p>
      {materials.map(({ id, name }) => <section key={id}><h2>{name}</h2><div className="topper-price-editor__grid">{topperSizes.map(({ cm, inch }) => <label key={cm}><span>{cm} cm / {inch} inch</span><span>RM <input required type="number" min="0.01" max="10000" step="0.01" inputMode="decimal" value={draft[id][cm]} onChange={(event) => change(id, cm, event.target.value)} /></span></label>)}</div></section>)}
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save all prices"}</button>
    </form>}
    {message && access === "owner" && <p className="admin-feedback" role="status">{message}</p>}
  </main><SiteFooter /></div>;
}
