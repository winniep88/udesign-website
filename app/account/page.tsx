"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAccount } from "@/components/AccountProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { addressText, type CustomerOrder, type SavedAddress, type WelcomeVoucher } from "@/lib/account";
import { formatRinggit } from "@/lib/catalog";

type AddressDraft = Omit<SavedAddress, "id" | "user_id"> & { id?: string };
const emptyAddress: AddressDraft = { label: "Home", recipient_name: "", phone: "", line1: "", line2: "", postcode: "", city: "", state: "", country: "MY", is_default: false };

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export default function AccountPage() {
  const { client, user, enabled, loading, refreshUser } = useAccount();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressDraft, setAddressDraft] = useState<AddressDraft | null>(null);
  const [vouchers, setVouchers] = useState<WelcomeVoucher[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [points, setPoints] = useState(0);
  const [accountLoading, setAccountLoading] = useState(false);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    activeUserId.current = user?.id ?? null;
    setName("");
    setWhatsapp("");
    setEmailOptIn(false);
    setWhatsappOptIn(false);
    setAddresses([]);
    setAddressDraft(null);
    setVouchers([]);
    setOrders([]);
    setPoints(0);
  }, [user?.id]);

  const loadAccount = useCallback(async () => {
    if (!client || !user) return;
    setAccountLoading(true);
    const [profile, prefs, saved, coupon, orderList, ledger] = await Promise.all([
      client.from("customer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      client.from("marketing_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      client.from("customer_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
      client.from("welcome_vouchers").select("*").eq("user_id", user.id).order("expires_at", { ascending: false }),
      client.from("customer_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      client.from("loyalty_ledger").select("*").eq("user_id", user.id),
    ]);
    if (activeUserId.current !== user.id) return;
    if (profile.data) {
      setName(profile.data.full_name ?? "");
      setWhatsapp(profile.data.whatsapp_phone ?? "");
    }
    setEmailOptIn(prefs.data?.email_opt_in === true);
    setWhatsappOptIn(prefs.data?.whatsapp_opt_in === true);
    setAddresses((saved.data ?? []) as SavedAddress[]);
    setVouchers((coupon.data ?? []) as WelcomeVoucher[]);
    setOrders((orderList.data ?? []) as CustomerOrder[]);
    setPoints(Math.max(0, (ledger.data ?? []).reduce((sum, entry) => sum + Number(entry.points_delta ?? entry.points ?? 0), 0)));
    const problem = [profile.error, prefs.error, saved.error, coupon.error, orderList.error, ledger.error].find(Boolean);
    if (problem) setMessage("Some account details could not be loaded. Please refresh and try again.");
    setAccountLoading(false);
  }, [client, user]);

  useEffect(() => { void loadAccount(); }, [loadAccount]);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setMessage("");
    const { error } = await client.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/account/` } });
    setBusy(false);
    if (error) setMessage(error.message);
    else { setSent(true); setMessage("Check your email for a sign-in code or link. It may take a minute to arrive."); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setMessage("");
    const { error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: "email" });
    setBusy(false);
    if (error) setMessage(error.message);
    else { setOtp(""); setSent(false); await refreshUser(); setMessage("You are signed in."); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!client || !user) return;
    setBusy(true); setMessage("");
    const { error } = await client.from("customer_profiles").update({ full_name: name.trim(), whatsapp_phone: whatsapp.trim() }).eq("user_id", user.id);
    setBusy(false);
    setMessage(error ? error.message : "Your details were saved.");
  }

  async function savePreferences(event: FormEvent) {
    event.preventDefault();
    if (!client || !user) return;
    setBusy(true); setMessage("");
    const { error } = await client.from("marketing_preferences").update({ email_opt_in: emailOptIn, whatsapp_opt_in: whatsappOptIn }).eq("user_id", user.id);
    setBusy(false);
    setMessage(error ? error.message : "Your promotion choices were saved.");
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    if (!client || !user || !addressDraft) return;
    const draft = { ...addressDraft, label: addressDraft.label.trim() || "Address", recipient_name: addressDraft.recipient_name.trim(), phone: addressDraft.phone.trim(), line1: addressDraft.line1.trim(), line2: addressDraft.line2?.trim() || null, postcode: addressDraft.postcode.trim(), city: addressDraft.city.trim(), state: addressDraft.state.trim() };
    if (!draft.recipient_name || !draft.phone || !draft.line1 || !draft.postcode || !draft.city || !draft.state) { setMessage("Please complete the required address fields."); return; }
    setBusy(true); setMessage("");
    const fields = { label: draft.label, recipient_name: draft.recipient_name, phone: draft.phone, line1: draft.line1, line2: draft.line2, postcode: draft.postcode, city: draft.city, state: draft.state, country: draft.country };
    const result = draft.id
      ? await client.from("customer_addresses").update({ ...fields, ...(draft.is_default ? {} : { is_default: false }) }).eq("id", draft.id).eq("user_id", user.id).select("id").single()
      : await client.from("customer_addresses").insert({ ...fields, user_id: user.id, is_default: false }).select("id").single();
    const error = result.error ?? ((draft.is_default || addresses.length === 0) && result.data ? (await client.rpc("set_default_address", { p_address_id: result.data.id })).error : null);
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setAddressDraft(null); setMessage("Address saved."); await loadAccount();
  }

  async function setDefaultAddress(addressId: string) {
    if (!client || !user) return;
    setBusy(true); setMessage("");
    const result = await client.rpc("set_default_address", { p_address_id: addressId });
    setBusy(false);
    setMessage(result.error ? result.error.message : "Default address updated.");
    if (!result.error) await loadAccount();
  }

  async function deleteAddress(addressId: string) {
    if (!client || !user) return;
    setBusy(true); setMessage("");
    const { error } = await client.from("customer_addresses").delete().eq("id", addressId).eq("user_id", user.id);
    setBusy(false);
    setMessage(error ? error.message : "Address deleted.");
    if (!error) await loadAccount();
  }

  return <div className="account-page"><SiteHeader /><main className="shell account-main">
    <div className="account-heading"><p className="eyebrow">UDESIGN PROJECTS STUDIO</p><h1>My account<span>.</span></h1><p>Keep your details, addresses, orders and rewards in one place.</p></div>
    {loading ? <p role="status">Loading account…</p> : !enabled ? <section className="account-card"><h2>Accounts are coming soon</h2><p>Shopping and WhatsApp requests are still available while we finish setup.</p><Link href="/cart/">Go to cart →</Link></section> : !user ? <section className="account-card account-signin"><h2>Sign in with email</h2><p>We&apos;ll email you a one-time code or sign-in link. No password needed.</p><form onSubmit={sendCode}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button type="submit" disabled={busy}>{busy ? "Sending…" : sent ? "Send another code" : "Email me a code"}</button></form>{sent && <form onSubmit={verifyCode}><label>Code from your email<input inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(event) => setOtp(event.target.value)} /></label><button type="submit" disabled={busy}>{busy ? "Checking…" : "Verify and sign in"}</button></form>}<p className="account-small">You can also shop as a guest. Creating an account never signs you up for promotions automatically.</p></section> : <>
      <div className="account-welcome"><div><p>Signed in as</p><strong>{user.email}</strong></div><button type="button" onClick={async () => { await client?.auth.signOut(); setMessage("You are signed out."); }}>Sign out</button></div>
      {accountLoading && <p role="status">Loading your details…</p>}
      <div className="account-grid">
        <section className="account-card"><h2>Your details</h2><form onSubmit={saveProfile}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" /></label><label>WhatsApp number<input type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={30} autoComplete="tel" placeholder="+60…" /></label><p className="account-small">Email: {user.email}. Order and design updates may use your contact details.</p><button disabled={busy} type="submit">Save details</button></form></section>
        <section className="account-card"><h2>Promotion choices</h2><p>These are optional and separate from messages about your orders.</p><form onSubmit={savePreferences}><label className="account-check"><input type="checkbox" checked={emailOptIn} onChange={(event) => setEmailOptIn(event.target.checked)} /> Email me offers and news</label><label className="account-check"><input type="checkbox" checked={whatsappOptIn} onChange={(event) => setWhatsappOptIn(event.target.checked)} /> Send me offers on WhatsApp</label><button disabled={busy} type="submit">Save choices</button></form></section>
        <section className="account-card account-card--wide"><div className="account-card__heading"><div><h2>Saved addresses</h2><p>Choose one at delivery checkout. Pickup does not need an address.</p></div><button type="button" onClick={() => setAddressDraft({ ...emptyAddress, is_default: addresses.length === 0 })}>Add address</button></div>
          {addresses.length === 0 && !addressDraft && <p>No saved addresses yet.</p>}
          <div className="account-addresses">{addresses.map((item) => <article key={item.id}><div><strong>{item.label || "Address"}{item.is_default ? " · Default" : ""}</strong><p>{item.recipient_name} · {item.phone}</p><p>{addressText(item)}</p></div><div className="account-address__actions"><button type="button" onClick={() => setAddressDraft({ ...item, state: item.state ?? "" })}>Edit</button>{!item.is_default && <button type="button" disabled={busy} onClick={() => void setDefaultAddress(item.id)}>Set default</button>}<button type="button" disabled={busy} onClick={() => void deleteAddress(item.id)}>Delete</button></div></article>)}</div>
          {addressDraft && <form className="account-address-form" onSubmit={saveAddress}><h3>{addressDraft.id ? "Edit address" : "Add address"}</h3><div className="account-form-grid"><label>Label<input value={addressDraft.label} maxLength={40} onChange={(event) => setAddressDraft({ ...addressDraft, label: event.target.value })} placeholder="Home or Office" /></label><label>Recipient name *<input required value={addressDraft.recipient_name} maxLength={100} onChange={(event) => setAddressDraft({ ...addressDraft, recipient_name: event.target.value })} /></label><label>Phone *<input required type="tel" value={addressDraft.phone} maxLength={30} onChange={(event) => setAddressDraft({ ...addressDraft, phone: event.target.value })} /></label><label>Country *<select value={addressDraft.country} onChange={(event) => setAddressDraft({ ...addressDraft, country: event.target.value })}><option value="MY">Malaysia</option><option value="SG">Singapore</option></select></label><label className="account-full">Address line 1 *<input required value={addressDraft.line1} maxLength={200} onChange={(event) => setAddressDraft({ ...addressDraft, line1: event.target.value })} /></label><label className="account-full">Address line 2 <span>(optional)</span><input value={addressDraft.line2 ?? ""} maxLength={200} onChange={(event) => setAddressDraft({ ...addressDraft, line2: event.target.value })} /></label><label>Postcode *<input required value={addressDraft.postcode} maxLength={20} onChange={(event) => setAddressDraft({ ...addressDraft, postcode: event.target.value })} /></label><label>City *<input required value={addressDraft.city} maxLength={100} onChange={(event) => setAddressDraft({ ...addressDraft, city: event.target.value })} /></label><label>State / region *<input required value={addressDraft.state} maxLength={100} onChange={(event) => setAddressDraft({ ...addressDraft, state: event.target.value })} /></label></div><label className="account-check"><input type="checkbox" checked={addressDraft.is_default} onChange={(event) => setAddressDraft({ ...addressDraft, is_default: event.target.checked })} /> Make this my default address</label><div className="account-form-actions"><button type="submit" disabled={busy}>Save address</button><button type="button" onClick={() => setAddressDraft(null)}>Cancel</button></div></form>}
        </section>
        <section className="account-card"><h2>Welcome voucher</h2>{vouchers.length === 0 ? <p>No voucher available yet.</p> : vouchers.map((voucher) => <div className="account-voucher" key={voucher.id}><strong>{voucher.code}</strong><p>RM10 off your first order of RM100 or more in products.</p><p>{voucher.redeemed_at ? "Used" : voucher.forfeited_at ? "No longer available" : voucher.reserved_at ? "Pending payment" : new Date(voucher.expires_at).getTime() <= Date.now() ? "Expired" : "Available"} · Expires {dateLabel(voucher.expires_at)}.</p></div>)}</section>
        <section className="account-card"><h2>Reward points</h2><p className="account-points">{points.toLocaleString("en-MY")} points</p><p>Worth {formatRinggit(points * 5)} towards a future order. Earn 1 point per RM1 of product spend after discounts when your order is completed.</p></section>
        <section className="account-card account-card--wide"><h2>Recent orders</h2>{orders.length === 0 ? <p>Your paid orders will appear here when linked to your account.</p> : <div className="account-orders">{orders.map((order) => <article key={order.id}><div><strong>Order {order.id.slice(0, 8).toUpperCase()}</strong><span>{dateLabel(order.created_at)}</span></div><div><span>{order.order_status.replaceAll("_", " ")}</span><strong>{formatRinggit(order.total_sen)}</strong></div></article>)}</div>}</section>
      </div>
    </>}
    {message && <p className="account-message" role="status">{message}</p>}
  </main><SiteFooter /></div>;
}
