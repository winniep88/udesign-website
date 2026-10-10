"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/AccountProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatRinggit } from "@/lib/catalog";
import "./admin.css";

type OwnerOrder = {
  id: string;
  created_at: string;
  source: "chip" | "manual";
  payment_status: string;
  order_status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfilment: "pickup" | "delivery";
  region?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  product_subtotal_sen?: number;
  shipping_sen: number;
  voucher_discount_sen: number;
  points_discount_sen: number;
  total_sen: number;
  chip_mode?: "live" | "test" | null;
  chip_purchase_id?: string | null;
  paid_at?: string | null;
  completed_at?: string | null;
  marketing_email_opt_in?: boolean;
  marketing_whatsapp_opt_in?: boolean;
};

type OwnerItem = {
  id: string;
  product_name: string;
  brand: string;
  quantity: number;
  unit_price_sen: number;
  item_snapshot?: { notes?: string; reference?: string; topper?: Record<string, unknown> } | null;
};

type CurrentMarketing = {
  email: string;
  whatsappPhone: string | null;
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  updatedAt: string | null;
};

type OrderDetail = { order: OwnerOrder; items: OwnerItem[]; currentMarketing: CurrentMarketing | null };

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "—";
}

function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function shortOrder(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function safeReference(value: string | undefined) {
  return value && /^\/api\/reference\/[0-9A-Za-z-]+\/$/.test(value) ? value : null;
}

export default function AdminPage() {
  const { client, user, enabled, loading } = useAccount();
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [access, setAccess] = useState<"checking" | "owner" | "denied" | "setup">("checking");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [manualReceived, setManualReceived] = useState(false);
  const [manualRefunded, setManualRefunded] = useState(false);

  const ownerFetch = useCallback(async (path: string, method = "GET", payload?: unknown) => {
    if (!client) throw new Error("Please sign in first.");
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Your sign-in has expired. Please sign in again.");
    const response = await fetch(path, {
      method,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    let body: Record<string, unknown> = {};
    try { body = await response.json(); } catch { /* Show a clear fallback below. */ }
    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : "We could not load the owner dashboard.";
      throw Object.assign(new Error(message), { status: response.status });
    }
    return body;
  }, [client]);

  const loadOrders = useCallback(async () => {
    if (!client || !user) return;
    setBusy(true);
    try {
      const body = await ownerFetch("/api/admin/orders/");
      setOrders(Array.isArray(body.orders) ? body.orders as OwnerOrder[] : []);
      setAccess("owner");
      setStatus("");
    } catch (error) {
      const failure = error as Error & { status?: number };
      setOrders([]);
      setDetail(null);
      setAccess(failure.status === 503 ? "setup" : "denied");
      setStatus(failure.message);
    } finally { setBusy(false); }
  }, [client, user, ownerFetch]);

  useEffect(() => { if (enabled && user) void loadOrders(); }, [enabled, user, loadOrders]);

  const openOrder = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setManualReceived(false);
    setManualRefunded(false);
    setBusy(true);
    try {
      const body = await ownerFetch(`/api/admin/orders/${encodeURIComponent(id)}/`);
      if (!body.order || !Array.isArray(body.items)) throw new Error("This order could not be loaded.");
      setDetail(body as OrderDetail);
      setStatus("");
    } catch (error) { setStatus((error as Error).message); }
    finally { setBusy(false); }
  }, [ownerFetch]);

  const action = useCallback(async (name: "complete" | "reconcile" | "manual-paid" | "manual-refunded") => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const result = await ownerFetch(`/api/admin/orders/${encodeURIComponent(selectedId)}/${name}/`, "POST", name === "manual-paid" ? { confirmedReceived: true } : name === "manual-refunded" ? { confirmedRefunded: true } : undefined);
      await loadOrders();
      await openOrder(selectedId);
      setStatus(name === "complete" ? "Order completed. Any earned points are now available." : name === "manual-paid" ? "Manual payment recorded." : name === "manual-refunded" ? "Manual refund recorded." : result.status === "refund_review" ? "CHIP reports a refund. Check its amount in CHIP; the customer’s rewards remain unchanged until a full refund is verified." : "CHIP payment status checked and updated.");
    } catch (error) { setStatus((error as Error).message); }
    finally { setBusy(false); }
  }, [selectedId, ownerFetch, loadOrders, openOrder]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    if (filter === "open" && (order.order_status === "completed" || order.order_status === "cancelled")) return false;
    if (filter === "completed" && order.order_status !== "completed") return false;
    const text = `${order.id} ${order.customer_name} ${order.customer_email} ${order.customer_phone}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }), [orders, filter, query]);

  const counts = useMemo(() => ({
    open: orders.filter((order) => order.order_status !== "completed" && order.order_status !== "cancelled").length,
    completed: orders.filter((order) => order.order_status === "completed").length,
    paid: orders.filter((order) => order.payment_status === "paid").length,
  }), [orders]);

  return <div className="admin-page"><SiteHeader /><main className="shell admin-main">
    <div className="admin-heading"><div><p className="eyebrow">UDESIGN PROJECTS STUDIO</p><h1>Owner dashboard<span>.</span></h1><p>Recent orders, customer requests and reward status.</p></div><Link href="/account/">My account ↗</Link></div>
    {loading || access === "checking" && enabled && user ? <p role="status">Checking your access…</p> : !enabled ? <section className="admin-notice"><h2>Owner dashboard is coming soon</h2><p>Customer accounts and private order records need their final setup before this view can open.</p></section> : !user ? <section className="admin-notice"><h2>Sign in first</h2><p>Use your UDESIGN owner email to open this private page.</p><Link href="/account/">Go to sign in →</Link></section> : access !== "owner" ? <section className="admin-notice"><h2>{access === "setup" ? "Owner access is being set up" : "Owner access required"}</h2><p>{status || "This page is only for UDESIGN's verified owner account."}</p></section> : <>
      <div className="admin-metrics"><div><span>Open orders</span><strong>{counts.open}</strong></div><div><span>Paid orders</span><strong>{counts.paid}</strong></div><div><span>Completed orders</span><strong>{counts.completed}</strong></div></div>
      <div className="admin-layout"><section className="admin-list"><div className="admin-section-heading"><div><h2>Orders</h2><p>Showing the latest 50. Check payment before fulfillment.</p></div><div className="admin-section-actions"><Link href="/admin/manual-order/">Add WhatsApp order</Link><button type="button" onClick={() => void loadOrders()} disabled={busy}>Refresh</button></div></div>
        <div className="admin-filters"><label>Search orders<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email or order number" /></label><label>Show<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All</option><option value="open">Open</option><option value="completed">Completed</option></select></label></div>
        {visibleOrders.length === 0 ? <p className="admin-empty">No matching orders yet.</p> : <div className="admin-order-list">{visibleOrders.map((order) => <button type="button" key={order.id} className={selectedId === order.id ? "is-selected" : ""} onClick={() => void openOrder(order.id)}><span><strong>#{shortOrder(order.id)}</strong><small>{shortDate(order.created_at)}</small></span><span><strong>{order.customer_name}</strong><small>{label(order.order_status)} · {label(order.payment_status)}</small></span><b>{formatRinggit(order.total_sen)}</b></button>)}</div>}
      </section><section className="admin-detail"><h2>Order details</h2>{!selectedId ? <p>Select an order to see its products, contact and delivery details.</p> : busy && !detail ? <p role="status">Loading order…</p> : !detail ? <p>Could not show this order. Please try again.</p> : <>
        <div className="admin-detail__top"><div><span>#{shortOrder(detail.order.id)}</span><h3>{detail.order.customer_name}</h3><p>{shortDate(detail.order.created_at)}</p></div><b>{formatRinggit(detail.order.total_sen)}</b></div>
        <div className="admin-status"><span>{label(detail.order.order_status)}</span><span>{label(detail.order.payment_status)}</span>{detail.order.source === "manual" && <span>WhatsApp order</span>}{detail.order.chip_mode === "test" && <span>Test payment</span>}</div>
        <dl className="admin-facts"><div><dt>Email</dt><dd><a href={`mailto:${detail.order.customer_email}`}>{detail.order.customer_email}</a></dd></div><div><dt>WhatsApp</dt><dd><a href={`https://wa.me/${detail.order.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">{detail.order.customer_phone} ↗</a></dd></div><div><dt>Fulfilment</dt><dd>{label(detail.order.fulfilment)}{detail.order.region ? ` · ${label(detail.order.region)}` : ""}</dd></div>{detail.order.delivery_address && <div><dt>Address</dt><dd>{detail.order.delivery_address}</dd></div>}{detail.order.notes && <div><dt>Order note</dt><dd>{detail.order.notes}</dd></div>}<div><dt>Choices at checkout (historical)</dt><dd>Email: {detail.order.marketing_email_opt_in ? "Yes" : "No"}; WhatsApp: {detail.order.marketing_whatsapp_opt_in ? "Yes" : "No"}</dd></div><div><dt>Current account choices</dt><dd>{detail.currentMarketing ? <>Email: {detail.currentMarketing.emailOptIn ? "Yes" : "No"}; WhatsApp: {detail.currentMarketing.whatsappOptIn ? "Yes" : "No"} · Updated {shortDate(detail.currentMarketing.updatedAt)}</> : "Unavailable"}</dd></div>{detail.currentMarketing && <div><dt>Current account contacts</dt><dd>Email: {detail.currentMarketing.email}; WhatsApp: {detail.currentMarketing.whatsappPhone || "No number saved"}</dd></div>}</dl>
        <p className="admin-help">An order shows the choices made at checkout. For promotions, use only the latest account choices and current account contacts. If current choices are unavailable, do not use this order as marketing permission.</p>
        <h4>Items</h4><div className="admin-items">{detail.items.map((item) => <article key={item.id}><div><strong>{item.product_name}</strong><p>{item.brand} · {item.quantity} × {formatRinggit(item.unit_price_sen)}</p>{item.item_snapshot?.notes && <p>Request: {item.item_snapshot.notes}</p>}{safeReference(item.item_snapshot?.reference) && <a href={safeReference(item.item_snapshot?.reference) ?? "#"} target="_blank" rel="noopener noreferrer">View reference image ↗</a>}</div><b>{formatRinggit(item.unit_price_sen * item.quantity)}</b></article>)}</div>
        <dl className="admin-totals"><div><dt>Products</dt><dd>{formatRinggit(detail.order.product_subtotal_sen ?? 0)}</dd></div><div><dt>Delivery</dt><dd>{formatRinggit(detail.order.shipping_sen)}</dd></div><div><dt>Voucher</dt><dd>−{formatRinggit(detail.order.voucher_discount_sen)}</dd></div><div><dt>Points</dt><dd>−{formatRinggit(detail.order.points_discount_sen)}</dd></div><div className="admin-totals__final"><dt>Total</dt><dd>{formatRinggit(detail.order.total_sen)}</dd></div></dl>
        <div className="admin-actions">{detail.order.payment_status === "paid" && detail.order.order_status !== "completed" && detail.order.chip_mode !== "test" && <button type="button" disabled={busy} onClick={() => void action("complete")}>Mark order completed</button>}{detail.order.chip_mode === "live" && detail.order.chip_purchase_id && <button type="button" disabled={busy} onClick={() => void action("reconcile")}>Check CHIP status</button>}</div>
        {detail.order.source === "manual" && detail.order.payment_status === "manual_unpaid" && <div className="admin-confirm"><label><input type="checkbox" checked={manualReceived} onChange={(event) => setManualReceived(event.target.checked)} /> I have received this payment outside the website.</label><button type="button" disabled={busy || !manualReceived} onClick={() => void action("manual-paid")}>Record payment received</button></div>}
        {detail.order.source === "manual" && detail.order.payment_status === "paid" && <div className="admin-confirm"><label><input type="checkbox" checked={manualRefunded} onChange={(event) => setManualRefunded(event.target.checked)} /> I have already sent this customer a refund.</label><button type="button" disabled={busy || !manualRefunded} onClick={() => void action("manual-refunded")}>Record refund sent</button></div>}
        <p className="admin-help">If an order needs a change, contact the customer first. Agree on a replacement or refund. For CHIP orders, handle the refund in CHIP, then check its status here. Recording a WhatsApp payment or refund here does not move money.</p>
      </>}</section></div>
    </>}
    {status && access === "owner" && <p className="admin-feedback" role="status">{status}</p>}
  </main><SiteFooter /></div>;
}
