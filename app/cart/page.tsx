"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart, type CartItem } from "@/components/CartProvider";
import { useAccount } from "@/components/AccountProvider";
import { type SavedAddress, type WelcomeVoucher } from "@/lib/account";
import { findVariant, formatRinggit, type CatalogProduct } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";
import { topperEvent, topperSelectionPriceSen, topperSizes, type TopperPricing } from "@/lib/topper";

type Fulfilment = "pickup" | "delivery";
const deliveryRegions = {
  west: { label: "West Malaysia", feeSen: 800, transit: "3 business days" },
  east: { label: "East Malaysia", feeSen: 1500, transit: "8–10 business days" },
  singapore: { label: "Singapore", feeSen: 2000, transit: "4 business days" },
} as const;
type DeliveryRegion = keyof typeof deliveryRegions;
const malaysiaStates = ["Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Putrajaya", "Sabah", "Sarawak", "Selangor", "Terengganu"];

function regionForAddress(saved: SavedAddress): DeliveryRegion {
  if (saved.country === "SG") return "singapore";
  return /sabah|sarawak|labuan/i.test(saved.state) ? "east" : "west";
}

function brandName(item: CartItem) {
  if (item.brand === "projects") return "UDESIGN PROJECTS";
  if (item.brand === "moments") return "UDESIGN MOMENTS";
  return "WINNIE CAKE TOPPER";
}

function selectedOption(item: CartItem, catalog: CatalogProduct[]) {
  return item.productId && item.variantId ? findVariant(item.productId, item.variantId, catalog) : undefined;
}

function itemUnitPriceSen(item: CartItem, catalog: CatalogProduct[], topperPrices: TopperPricing | null) {
  if (item.topper) return topperSelectionPriceSen(item.topper, topperPrices ?? undefined);
  return selectedOption(item, catalog)?.priceSen;
}

function topperDetails(item: CartItem) {
  if (!item.topper) return [];
  const choice = item.topper;
  const inch = topperSizes.find((size) => size.cm === choice.sizeCm)?.inch;
  return [
    `Event: ${topperEvent(choice.eventSlug)?.name ?? choice.eventSlug}`,
    `Wording: ${choice.wording.join(" / ")}`,
    `Font style: ${choice.fontFamily ?? "Studio to choose"}`,
    `Material: ${choice.material[0].toUpperCase()}${choice.material.slice(1)}`,
    `Colour or finish: ${choice.finish}`,
    `Width: ${choice.sizeCm} cm${inch ? ` / ${inch} inch` : ""}`,
    ...(choice.details ? [`Design details: ${choice.details}`] : []),
  ];
}

export default function CartPage() {
  const { items, catalog: liveCatalog, topperPrices, count, ready, setQuantity, setNotes, removeItem, clearCart } = useCart();
  const { enabled: accountEnabled, client: accountClient, user } = useAccount();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [deliveryRegion, setDeliveryRegion] = useState<DeliveryRegion | "">("");
  const [shipCountry, setShipCountry] = useState<"MY" | "SG">("MY");
  const [shipFullName, setShipFullName] = useState("");
  const [shipCompany, setShipCompany] = useState("");
  const [shipLine1, setShipLine1] = useState("");
  const [shipLine2, setShipLine2] = useState("");
  const [shipPostcode, setShipPostcode] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [paymentAvailable, setPaymentAvailable] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveShippingAddress, setSaveShippingAddress] = useState(false);
  const [welcomeVoucher, setWelcomeVoucher] = useState<WelcomeVoucher | null>(null);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [useVoucher, setUseVoucher] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [billingDifferent, setBillingDifferent] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [shipNameError, setShipNameError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [regionError, setRegionError] = useState("");
  const shipNameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const regionRef = useRef<HTMLSelectElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/checkout/status/", { cache: "no-store" }).then((response) => response.json()).then((data) => setPaymentAvailable(data.available === true)).catch(() => setPaymentAvailable(false));
  }, []);

  useEffect(() => {
    if (!accountClient || !user) {
      setSavedAddresses([]);
      setSelectedAddressId("");
      setSaveShippingAddress(false);
      setDeliveryRegion("");
      setWelcomeVoucher(null);
      setAvailablePoints(0);
      setUseVoucher(false);
      setVoucherInput("");
      setVoucherMessage("");
      setRedeemPoints(0);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setEmailOptIn(false);
      setWhatsappOptIn(false);
      return;
    }
    let active = true;
    Promise.all([
      accountClient.from("customer_profiles").select("full_name,whatsapp_phone").eq("user_id", user.id).maybeSingle(),
      accountClient.from("customer_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
      accountClient.from("welcome_vouchers").select("*").eq("user_id", user.id).order("expires_at", { ascending: false }),
      accountClient.from("loyalty_ledger").select("*").eq("user_id", user.id),
      accountClient.from("marketing_preferences").select("email_opt_in,whatsapp_opt_in").eq("user_id", user.id).maybeSingle(),
    ]).then(([profile, saved, voucher, ledger, prefs]) => {
      if (!active) return;
      setCustomerEmail(user.email ?? "");
      const profileName = profile.data?.full_name || "";
      setCustomerName(profileName);
      setShipFullName(profileName);
      setCustomerPhone(profile.data?.whatsapp_phone || "");
      const addressList = (saved.data ?? []) as SavedAddress[];
      setSavedAddresses(addressList);
      const currentVoucher = ((voucher.data ?? []) as WelcomeVoucher[]).find((item) => !item.redeemed_at && !item.reserved_at && !item.forfeited_at && new Date(item.expires_at).getTime() > Date.now());
      setWelcomeVoucher(currentVoucher ?? null);
      if (currentVoucher) setVoucherInput((current) => current || currentVoucher.code);
      setAvailablePoints(Math.max(0, (ledger.data ?? []).reduce((sum, entry) => sum + Number(entry.points_delta ?? entry.points ?? 0), 0)));
      setEmailOptIn(prefs.data?.email_opt_in === true);
      setWhatsappOptIn(prefs.data?.whatsapp_opt_in === true);
    }).catch(() => {});
    return () => { active = false; };
  }, [accountClient, user]);

  const pricing = useMemo(() => items.reduce((result, item) => {
    const unitPriceSen = itemUnitPriceSen(item, liveCatalog, topperPrices);
    if (unitPriceSen !== undefined) result.subtotalSen += unitPriceSen * item.quantity;
    else result.needsQuote = true;
    return result;
  }, { subtotalSen: 0, needsQuote: false }), [items, liveCatalog, topperPrices]);
  const cakeTopperOnly = items.length > 0 && items.every((item) => item.brand === "winnie");
  const shippingName = shipFullName.trim();
  const checkoutName = fulfilment === "delivery" ? shippingName : customerName.trim();
  const address = [shipCompany, shipLine1, shipLine2, shipPostcode, shipCity, shipState, shipCountry === "SG" ? "Singapore" : "Malaysia"].map((part) => part.trim()).filter(Boolean).join(", ");
  const region = deliveryRegion ? deliveryRegions[deliveryRegion] : null;
  const deliveryFeeSen = fulfilment === "delivery" && cakeTopperOnly && region ? region.feeSen : 0;
  const deliveryNeedsQuote = fulfilment === "delivery" && !cakeTopperOnly;
  const totalToConfirm = pricing.needsQuote || deliveryNeedsQuote || (fulfilment === "delivery" && !region);
  const voucherCanApply = Boolean(paymentAvailable && !totalToConfirm && user && welcomeVoucher && pricing.subtotalSen >= 10000);
  const voucherDiscountSen = useVoucher && voucherCanApply ? 1000 : 0;
  const maxRedeemPoints = Math.max(0, Math.min(availablePoints, Math.floor((pricing.subtotalSen - voucherDiscountSen) / 5)));
  const appliedPoints = !paymentAvailable || totalToConfirm || voucherDiscountSen > 0 ? 0 : Math.min(Math.max(0, redeemPoints), maxRedeemPoints);
  const checkoutTotalSen = Math.max(0, pricing.subtotalSen + deliveryFeeSen - voucherDiscountSen - appliedPoints * 5);
  const checkoutNotes = [extraNotes.trim(), fulfilment === "delivery" && billingDifferent ? `Different billing name/address: ${billingAddress.trim()}` : ""].filter(Boolean).join(" | ");
  const itemSubtotalText = pricing.needsQuote
    ? pricing.subtotalSen ? `${formatRinggit(pricing.subtotalSen)} + item price to confirm` : "To confirm"
    : formatRinggit(pricing.subtotalSen);

  const summary = useMemo(() => {
    const lines = ["Hi UDESIGN, I'd like to request these items:", ""];
    items.forEach((item, index) => {
      const option = selectedOption(item, liveCatalog);
      const unitPriceSen = itemUnitPriceSen(item, liveCatalog, topperPrices);
      lines.push(`${index + 1}. ${brandName(item)} — ${item.product}`);
      if (option) lines.push(`   Option: ${option.name}`);
      topperDetails(item).forEach((detail) => lines.push(`   ${detail}`));
      lines.push(`   Quantity: ${item.quantity}${unitPriceSen !== undefined ? ` × ${formatRinggit(unitPriceSen)} = ${formatRinggit(unitPriceSen * item.quantity)}` : " · Price to confirm"}`);
      if (item.referenceImage) lines.push(`   Reference image: ${window.location.origin}${item.referenceImage.url}`);
      if (item.notes.trim()) lines.push(`   Personalisation: ${item.notes.trim()}`);
    });
    lines.push("", `Item subtotal: ${itemSubtotalText}`);
    lines.push("", `Fulfilment: ${fulfilment === "pickup" ? "Pickup in Kuchai Lama, Kuala Lumpur" : "Delivery"}`);
    if (fulfilment === "delivery") {
      lines.push(`Recipient: ${shippingName || "To be provided"}`);
      lines.push(`Phone: ${customerPhone.trim() || "To be provided"}`);
      lines.push(`Delivery region: ${region?.label ?? "To be selected"}`);
      lines.push(`Delivery fee: ${cakeTopperOnly && region ? formatRinggit(region.feeSen) : "To confirm for this cart"}`);
      if (cakeTopperOnly && region) lines.push(`Estimated transit after dispatch: ${region.transit}`);
      lines.push(`Delivery address: ${address.trim() || "To be provided"}`);
    } else if (cakeTopperOnly) lines.push("Pickup: cake toppers are usually ready about 3 hours after design confirmation, during collection hours. We will confirm the time on WhatsApp.");
    if (voucherDiscountSen) lines.push("Welcome voucher: -RM10.00 (subject to checkout confirmation)");
    if (appliedPoints) lines.push(`Points selected: ${appliedPoints} (subject to checkout confirmation)`);
    lines.push(`Total to pay: ${totalToConfirm ? "To confirm" : formatRinggit(checkoutTotalSen)}`);
    if (fulfilment === "delivery" && billingDifferent && billingAddress.trim()) lines.push(`Different billing name/address: ${billingAddress.trim()}`);
    if (extraNotes.trim()) lines.push(`Other notes: ${extraNotes.trim()}`);
    lines.push("", "Please confirm the design, ready date, final total and payment instructions. Thank you!");
    return lines.join("\n");
  }, [items, liveCatalog, topperPrices, pricing, itemSubtotalText, fulfilment, region, cakeTopperOnly, totalToConfirm, shippingName, customerPhone, address, extraNotes, voucherDiscountSen, appliedPoints, checkoutTotalSen, billingDifferent, billingAddress]);

  function redeemVoucher() {
    setVoucherMessage("");
    setUseVoucher(false);
    const code = voucherInput.trim();
    if (!code) { setVoucherMessage("Enter your voucher code first."); return; }
    if (!user) { setVoucherMessage("Sign in to your account first to redeem your welcome voucher."); return; }
    if (!welcomeVoucher || code.toUpperCase() !== welcomeVoucher.code.toUpperCase()) { setVoucherMessage("This voucher is not available in your account. Check the code shown in My account."); return; }
    if (pricing.subtotalSen < 10000) { setVoucherMessage("Add products worth at least RM100 before delivery charges to use this voucher."); return; }
    if (!paymentAvailable || totalToConfirm) { setVoucherMessage("We need to confirm this order's price before applying a voucher. Please contact us on WhatsApp."); return; }
    setRedeemPoints(0);
    setUseVoucher(true);
    setVoucherMessage("RM10 welcome voucher applied.");
  }

  function validateRequest() {
    if (fulfilment === "delivery" && !deliveryRegion) {
      setRegionError("Please choose your state or territory.");
      regionRef.current?.focus();
      return false;
    }
    setRegionError("");
    if (fulfilment === "delivery" && !shippingName) {
      setShipNameError("Enter the recipient's full name first.");
      shipNameRef.current?.focus();
      return false;
    }
    setShipNameError("");
    if (fulfilment === "delivery" && (!shipLine1.trim() || !shipPostcode.trim() || !shipCity.trim() || !shipState.trim() || !customerPhone.trim() || address.length > 500)) {
      setAddressError(address.length > 500 ? "Please shorten your delivery address." : "Please complete the recipient, phone and delivery address fields.");
      addressRef.current?.focus();
      return false;
    }
    setAddressError("");
    return true;
  }

  async function copySummary() {
    setCopyMessage("");
    if (!validateRequest()) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopyMessage("Copied. You can paste this into WhatsApp if needed.");
    } catch {
      summaryRef.current?.focus();
      summaryRef.current?.select();
      setCopyMessage("Select and copy the request above, then paste it into WhatsApp.");
    }
  }

  async function payNow() {
    setPaymentError("");
    if (!validateRequest()) return;
    if (!checkoutName || !customerEmail.trim() || !customerPhone.trim()) { setPaymentError("Please enter your name, email and WhatsApp number."); return; }
    if (fulfilment === "delivery" && billingDifferent && !billingAddress.trim()) { setPaymentError("Enter the different billing name and address, or choose Same as delivery address."); return; }
    if (checkoutNotes.length > 500) { setPaymentError("Please shorten your order remark or billing address to continue."); return; }
    if (!orderConfirmed) { setPaymentError("Please confirm that you have checked your order details before paying."); return; }
    setPaying(true);
    try {
      const session = user ? (await accountClient?.auth.getSession())?.data.session : null;
      if (user && !session) throw new Error("Your sign-in has expired. Please sign in again to use rewards.");
      if (fulfilment === "delivery" && saveShippingAddress && !selectedAddressId && user && accountClient) {
        const { data: saved, error: saveError } = await accountClient.from("customer_addresses").insert({
          user_id: user.id, label: "Address", recipient_name: shippingName, phone: customerPhone.trim(),
          line1: shipLine1.trim(), line2: [shipCompany.trim(), shipLine2.trim()].filter(Boolean).join(", ") || null,
          postcode: shipPostcode.trim(), city: shipCity.trim(), state: shipState.trim(), country: shipCountry, is_default: false,
        }).select("*").single();
        if (saveError || !saved) throw new Error("We could not save this address. Please try again or untick ‘Save this address’ to continue.");
        setSavedAddresses((current) => [saved as SavedAddress, ...current]);
        setSelectedAddressId(saved.id);
      }
      const response = await fetch("/api/checkout/", { method: "POST", headers: { "content-type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ items, fulfilment, region: deliveryRegion, address, extraNotes: checkoutNotes, customer: { name: checkoutName, email: customerEmail, phone: customerPhone }, marketing: { emailOptIn, whatsappOptIn }, ...(voucherDiscountSen && welcomeVoucher ? { voucherCode: welcomeVoucher.code } : {}), ...(appliedPoints ? { redeemPoints: appliedPoints } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment checkout is unavailable. Please try again.");
      if (typeof data.checkoutUrl !== "string" || new URL(data.checkoutUrl).hostname !== "gate.chip-in.asia") throw new Error("Payment checkout is unavailable. Please contact us.");
      window.location.assign(data.checkoutUrl);
    } catch (error) { setPaymentError(error instanceof Error ? error.message : "Payment checkout is unavailable. Please try again."); setPaying(false); }
  }

  return (
    <div className="cart-page">
      <SiteHeader active="cart" />
      <main>
        <section className="cart-hero shell">
          <p className="eyebrow">YOUR CUSTOM PIECES</p>
          <h1>Your cart<span>.</span></h1>
          <p>Bring pieces from all three UDESIGN brands together. Choose pickup or delivery, then pay securely or send us your request on WhatsApp.</p>
        </section>

        {!ready ? (
          <div className="cart-content shell" role="status">Loading your cart…</div>
        ) : items.length === 0 ? (
          <section className="cart-empty shell" aria-labelledby="empty-cart-title">
            <h2 id="empty-cart-title">Nothing in your cart yet.</h2>
            <p>Find something made for your moment, then add your details.</p>
            <div className="cart-empty__links">
              <Link href="/projects/">Explore Projects <span aria-hidden="true">→</span></Link>
              <Link href="/moments/">Explore Moments <span aria-hidden="true">→</span></Link>
              <Link href="/winnie-cake-topper/">Explore Winnie Cake Topper <span aria-hidden="true">→</span></Link>
            </div>
          </section>
        ) : (
          <div className="cart-content shell">
            <section className="cart-items" aria-labelledby="cart-items-title">
              <div className="cart-section-heading"><div><span>01 / YOUR PIECES</span><h2 id="cart-items-title">{count} {count === 1 ? "piece" : "pieces"} to make yours</h2></div><button type="button" onClick={clearCart}>Clear cart</button></div>
              <div className="cart-items__list">
                {items.map((item) => (
                  <article className={`cart-item cart-item--${item.brand}`} key={item.id}>
                    <div className="cart-item__heading"><div><p>{brandName(item)}</p><h3>{item.product}</h3></div><button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.product} from cart`}>Remove</button></div>
                    {selectedOption(item, liveCatalog) && <p className="cart-item__option"><span>Selected option</span><strong>{selectedOption(item, liveCatalog)!.name}</strong></p>}
                    {item.topper && <div className="cart-item__topper-details">{topperDetails(item).map((detail) => <p key={detail}>{detail}</p>)}</div>}
                    {item.referenceImage && <p className="cart-item__reference">Reference image: <a href={item.referenceImage.url} target="_blank" rel="noopener noreferrer">{item.referenceImage.name} ↗</a></p>}
                    <div className="cart-item__fields">
                      <div className="cart-item__quantity"><span>Quantity</span><div><button type="button" aria-label={`Decrease ${item.product} quantity`} disabled={item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)}>−</button><output aria-label={`${item.product} quantity`}>{item.quantity}</output><button type="button" aria-label={`Increase ${item.product} quantity`} disabled={item.quantity >= 99} onClick={() => setQuantity(item.id, item.quantity + 1)}>+</button></div></div>
                      <label className="cart-field">Personalisation or idea<textarea rows={3} maxLength={1000} placeholder="Names, colours, theme, size or other details" value={item.notes} onChange={(event) => setNotes(item.id, event.target.value)} /></label>
                    </div>
                    <p className="cart-item__price"><span>{itemUnitPriceSen(item, liveCatalog, topperPrices) !== undefined ? `Unit price ${formatRinggit(itemUnitPriceSen(item, liveCatalog, topperPrices)!)}` : "Custom item price"}</span><strong>{itemUnitPriceSen(item, liveCatalog, topperPrices) !== undefined ? formatRinggit(itemUnitPriceSen(item, liveCatalog, topperPrices)! * item.quantity) : "To confirm"}</strong></p>
                  </article>
                ))}
              </div>
              <div className="cart-continue"><Link href="/projects/">+ Add from Projects</Link><Link href="/moments/">+ Add from Moments</Link><Link href="/winnie-cake-topper/">+ Add from Winnie Cake Topper</Link></div>
            </section>

            {accountEnabled && <section className="cart-account" aria-label="Account and rewards">
              {user ? <><strong>Shopping as {user.email}</strong><p>Your saved addresses and rewards can be used at checkout. <Link href="/account/">Manage your account →</Link></p></> : <><strong>New here? Get RM10 off your first order</strong><p>Sign in with email to receive your voucher. It works on a first order of RM100 or more in products and expires two months after issue. You can still check out as a guest; guest orders do not earn points.</p><Link href="/account/">Sign in or create an account →</Link></>}
            </section>}

            <section className="cart-checkout" aria-labelledby="cart-checkout-title">
              <div className="cart-section-heading"><div><span>02 / HOW YOU&apos;LL RECEIVE IT</span><h2 id="cart-checkout-title">Delivery or pickup</h2></div></div>
              <fieldset className="cart-fulfilment"><legend>Choose Ship or Pickup</legend>
                <label className={fulfilment === "delivery" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} /><span aria-hidden="true">▣</span><strong>Ship</strong></label>
                <label className={fulfilment === "pickup" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => { setFulfilment("pickup"); setAddressError(""); setRegionError(""); }} /><span aria-hidden="true">⌖</span><strong>Pickup</strong></label>
              </fieldset>
              {fulfilment === "delivery" && <div className="cart-delivery-fields">
                {user && savedAddresses.length > 0 && <label className="cart-field cart-field--full">Use a saved address
                  <select value={selectedAddressId} onChange={(event) => { const id = event.target.value; setSelectedAddressId(id); setSaveShippingAddress(false); const selected = savedAddresses.find((item) => item.id === id); if (selected) { setShipFullName(selected.recipient_name); setShipCountry(selected.country === "SG" ? "SG" : "MY"); setShipCompany(""); setShipLine1(selected.line1); setShipLine2(selected.line2 ?? ""); setShipPostcode(selected.postcode); setShipCity(selected.city); setShipState(selected.state); setCustomerPhone(selected.phone); setDeliveryRegion(regionForAddress(selected)); setAddressError(""); setRegionError(""); } else { setShipLine1(""); setShipLine2(""); setShipPostcode(""); setShipCity(""); setShipState(""); setDeliveryRegion(""); } }}>
                    <option value="">Enter a different address</option>
                    {savedAddresses.map((item) => <option key={item.id} value={item.id}>{item.label || "Address"}{item.is_default ? " (default)" : ""} — {item.line1}</option>)}
                  </select>
                </label>}
                <div className={`cart-shipping-fields${shipCountry === "SG" ? " cart-shipping-fields--sg" : ""}`}>
                  <label className="cart-field cart-shipping-fields__full">Country/Region<select value={shipCountry} onChange={(event) => { const country = event.target.value as "MY" | "SG"; setShipCountry(country); setShipState(country === "SG" ? "Singapore" : ""); setShipCity(country === "SG" ? "Singapore" : ""); setDeliveryRegion(country === "SG" ? "singapore" : ""); setSelectedAddressId(""); setRegionError(""); }}><option value="MY">Malaysia</option><option value="SG">Singapore</option></select></label>
                  <label className="cart-field cart-shipping-fields__full">Full name<input ref={shipNameRef} type="text" autoComplete="name" maxLength={100} required value={shipFullName} onChange={(event) => { setShipFullName(event.target.value); setShipNameError(""); }} aria-invalid={Boolean(shipNameError)} aria-describedby={shipNameError ? "cart-ship-name-error" : undefined} />{shipNameError && <span className="cart-field__error" id="cart-ship-name-error" role="alert">{shipNameError}</span>}</label>
                  <label className="cart-field cart-shipping-fields__full">Company <span>(optional)</span><input type="text" autoComplete="organization" maxLength={80} value={shipCompany} onChange={(event) => setShipCompany(event.target.value)} /></label>
                  <label className="cart-field cart-shipping-fields__full">Address<input ref={addressRef} type="text" autoComplete="address-line1" maxLength={200} required value={shipLine1} onChange={(event) => { setShipLine1(event.target.value); setAddressError(""); setSelectedAddressId(""); }} aria-invalid={Boolean(addressError)} aria-describedby={addressError ? "cart-address-error" : undefined} />{addressError && <span className="cart-field__error" id="cart-address-error" role="alert">{addressError}</span>}</label>
                  <label className="cart-field cart-shipping-fields__full">Apartment, suite, etc. <span>(optional)</span><input type="text" autoComplete="address-line2" maxLength={110} value={shipLine2} onChange={(event) => { setShipLine2(event.target.value); setSelectedAddressId(""); }} /></label>
                  <label className="cart-field cart-shipping-fields__third">Postcode<input type="text" autoComplete="postal-code" maxLength={20} required value={shipPostcode} onChange={(event) => { setShipPostcode(event.target.value); setSelectedAddressId(""); }} /></label>
                  <label className="cart-field cart-shipping-fields__third">City<input type="text" autoComplete="address-level2" maxLength={100} required value={shipCity} onChange={(event) => { setShipCity(event.target.value); setSelectedAddressId(""); }} /></label>
                  {shipCountry === "MY" && <label className="cart-field cart-shipping-fields__third">State/territory<select ref={regionRef} autoComplete="address-level1" required value={shipState} onChange={(event) => { const state = event.target.value; setShipState(state); setDeliveryRegion(state ? /sabah|sarawak|labuan/i.test(state) ? "east" : "west" : ""); setSelectedAddressId(""); setRegionError(""); }} aria-invalid={Boolean(regionError)} aria-describedby={regionError ? "cart-region-error" : undefined}><option value="">Choose state</option>{shipState && !malaysiaStates.includes(shipState) && <option value={shipState}>{shipState}</option>}{malaysiaStates.map((state) => <option value={state} key={state}>{state}</option>)}</select>{regionError && <span className="cart-field__error" id="cart-region-error" role="alert">{regionError}</span>}</label>}
                  <label className="cart-field cart-shipping-fields__full">Phone / WhatsApp number<input type="tel" autoComplete="tel" maxLength={30} required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>
                </div>
                {user && paymentAvailable && !totalToConfirm && !selectedAddressId && <label className="cart-save-address"><input type="checkbox" checked={saveShippingAddress} onChange={(event) => setSaveShippingAddress(event.target.checked)} />Save this address in my account</label>}
                {user && (!paymentAvailable || totalToConfirm) && <p className="cart-delivery-fields__note">You can save this address from <Link href="/account/">My account</Link> for future orders.</p>}
                {!user && accountEnabled && <p className="cart-delivery-fields__note"><Link href="/account/">Sign in</Link> to save this address for future orders. Guest checkout is still available.</p>}
                {region && <p className="cart-delivery-fields__note">{region.label}: {cakeTopperOnly ? `${formatRinggit(region.feeSen)} delivery · about ${region.transit} after dispatch.` : "We’ll confirm the delivery fee and timing before payment."}</p>}
                <p className="cart-delivery-fields__note">{cakeTopperOnly ? "Delivery fees are for a cake topper order. Transit times are estimates after dispatch." : "This cart includes other products, so we&apos;ll confirm the delivery fee and timing on WhatsApp."}</p>
              </div>}
              {fulfilment === "pickup" && <div className="cart-pickup-card"><p>1 pickup location for your order</p><div><h3>UDESIGN PROJECTS STUDIO · Kuchai Lama</h3><strong>FREE</strong></div><address>18, Jalan Rukun 1, Taman Continental, Kuchai Jaya, Kuchai Lama, 58200 Kuala Lumpur</address><p>Collection hours: Monday–Friday, 9:00 am–4:00 pm. We&apos;ll confirm your pickup time on WhatsApp.</p>{cakeTopperOnly && <p>Cake toppers are usually ready in about 3 hours after we confirm your design, during collection hours.</p>}</div>}
              <p className="cart-urgent">Need it urgently? <a href={whatsappLink("Hi UDESIGN, I have an urgent order and can pick it up in Kuchai Lama, KL. Could you confirm if it is possible?")} target="_blank" rel="noopener noreferrer">Contact us on WhatsApp ↗</a> We&apos;ll confirm availability before you travel.</p>
              <div className="cart-quote">
                <h3>Order summary</h3>
                <div className="cart-quote__items">{items.map((item) => <div className="cart-quote__item" key={item.id}><span>{item.product} <small>× {item.quantity}</small></span><strong>{itemUnitPriceSen(item, liveCatalog, topperPrices) !== undefined ? formatRinggit(itemUnitPriceSen(item, liveCatalog, topperPrices)! * item.quantity) : "To confirm"}</strong></div>)}</div>
                <div className="cart-quote__row"><h3>Item subtotal</h3><strong>{itemSubtotalText}</strong></div>
                {fulfilment === "delivery" && <div className="cart-quote__row"><span>Delivery</span><strong>{cakeTopperOnly && region ? formatRinggit(region.feeSen) : "To confirm"}</strong></div>}
                {paymentAvailable && !totalToConfirm && user && availablePoints > 0 && voucherDiscountSen === 0 && <label className="cart-field cart-redeem">Use reward points <span>(optional, 1 point = RM0.05)</span><input type="number" min={0} max={maxRedeemPoints} step={1} value={redeemPoints} onChange={(event) => setRedeemPoints(Math.min(maxRedeemPoints, Math.max(0, Math.floor(Number(event.target.value) || 0))))} /><small>{availablePoints} available · up to {maxRedeemPoints} for this order</small></label>}
                {voucherDiscountSen > 0 && <div className="cart-quote__row"><span>Welcome voucher</span><strong>−RM10.00</strong></div>}
                {appliedPoints > 0 && <div className="cart-quote__row"><span>{appliedPoints} points</span><strong>−{formatRinggit(appliedPoints * 5)}</strong></div>}
                <div className="cart-quote__row cart-quote__row--total"><span>Total to pay</span><strong>{totalToConfirm ? "To confirm" : formatRinggit(checkoutTotalSen)}</strong></div>
                <p>{fulfilment === "delivery" && cakeTopperOnly && region ? `${region.label}: estimated ${region.transit} after dispatch. ` : fulfilment === "pickup" ? "Pickup in Kuchai Lama, Kuala Lumpur; we'll confirm your collection time. " : "Delivery timing to confirm. "}We&apos;ll send a design confirmation on WhatsApp. If we need to change or cannot make an order, we&apos;ll contact you first and agree on a replacement or refund.</p>
              </div>
              <section className="cart-voucher" aria-labelledby="cart-voucher-title">
                <h3 id="cart-voucher-title">Voucher</h3>
                <p>Enter your welcome voucher code and tap Redeem. RM10 off your first order with at least RM100 in products before delivery.</p>
                {user && welcomeVoucher && <p className="cart-voucher__available">Your code: <strong>{welcomeVoucher.code}</strong> · expires {new Date(welcomeVoucher.expires_at).toLocaleDateString("en-MY")}</p>}
                <form className="cart-voucher__entry" onSubmit={(event) => { event.preventDefault(); redeemVoucher(); }}><label htmlFor="cart-voucher-code">Voucher code</label><div><input id="cart-voucher-code" type="text" autoComplete="off" maxLength={40} value={voucherInput} onChange={(event) => { setVoucherInput(event.target.value); setUseVoucher(false); setVoucherMessage(""); }} /><button type="submit">Redeem</button></div></form>
                {useVoucher && !voucherCanApply ? <p className="cart-voucher__message" role="status">The voucher is no longer applied. Check the RM100 product minimum and order price.</p> : voucherMessage && <p className="cart-voucher__message" role="status">{voucherMessage}</p>}
                {!user && accountEnabled && <p><Link href="/account/">Sign in to use your voucher</Link>. Guest checkout remains available.</p>}
                {useVoucher && <button className="cart-voucher__remove" type="button" onClick={() => { setUseVoucher(false); setVoucherMessage(""); }}>Remove voucher</button>}
              </section>
              <div className="cart-checkout__extra"><label className="cart-field">Order remark <span>(optional)</span><textarea rows={3} maxLength={500} placeholder="Any other request we should know" value={extraNotes} onChange={(event) => setExtraNotes(event.target.value)} /></label></div>
            </section>

            <section className="cart-request" aria-labelledby="cart-request-title">
              <div className="cart-section-heading"><div><span>03 / PLACE YOUR ORDER</span><h2 id="cart-request-title">Ready to order?</h2></div></div>
              {paymentAvailable && !totalToConfirm && <div className="cart-delivery-fields">
                {fulfilment === "pickup" && <label className="cart-field">Full name<input type="text" value={customerName} maxLength={100} autoComplete="name" onChange={(event) => setCustomerName(event.target.value)} /></label>}
                <label className="cart-field">Email<input type="email" value={customerEmail} maxLength={150} autoComplete="email" onChange={(event) => setCustomerEmail(event.target.value)} /></label>
                {fulfilment === "pickup" && <label className="cart-field">WhatsApp number<input type="tel" value={customerPhone} maxLength={30} autoComplete="tel" onChange={(event) => setCustomerPhone(event.target.value)} /></label>}
                <section className="cart-payment" aria-labelledby="cart-payment-title"><h3 id="cart-payment-title">Payment</h3><p>Payment details are entered on CHIP&apos;s secure page.</p><div className="cart-payment__method"><div><span className="cart-payment__radio" aria-hidden="true" /><strong>Online banking / DuitNow QR</strong></div><p>After clicking Pay Now, you&apos;ll go to CHIP to complete your payment securely.</p></div></section>
                {fulfilment === "delivery" && <fieldset className="cart-billing"><legend>Billing address</legend><label><input type="radio" name="billing-address" checked={!billingDifferent} onChange={() => setBillingDifferent(false)} /> Same as delivery address</label><label><input type="radio" name="billing-address" checked={billingDifferent} onChange={() => setBillingDifferent(true)} /> Use a different billing address</label>{billingDifferent && <label className="cart-field">Billing name and full address<textarea rows={3} maxLength={400} value={billingAddress} onChange={(event) => setBillingAddress(event.target.value)} placeholder="Full name, street, postcode, city, state and country" /></label>}</fieldset>}
                <div className="cart-marketing"><p>Optional promotions</p><label><input type="checkbox" checked={emailOptIn} onChange={(event) => setEmailOptIn(event.target.checked)} /> Email me offers and news</label><label><input type="checkbox" checked={whatsappOptIn} onChange={(event) => setWhatsappOptIn(event.target.checked)} /> Send me offers on WhatsApp</label><small>We may still contact you about this order and your design.</small></div>
                <label className="cart-confirm"><input type="checkbox" checked={orderConfirmed} onChange={(event) => { setOrderConfirmed(event.target.checked); setPaymentError(""); }} /><span>I have checked my order details and understand UDESIGN will confirm the custom design and fulfilment timing before making it. I have read the <Link href="/privacy/" target="_blank">Privacy Policy</Link>.</span></label>
                <button className="cart-pay-now" type="button" disabled={paying} onClick={payNow}>{paying ? "Opening secure checkout…" : `Pay Now · ${formatRinggit(checkoutTotalSen)}`}</button>
                {paymentError && <p className="cart-field__error" role="alert">{paymentError}</p>}
              </div>}
              {!paymentAvailable && <p>Online payment will open once our CHIP account is approved. For now, send us your request on WhatsApp.</p>}
              {paymentAvailable && totalToConfirm && <p>This cart needs a delivery or item price confirmed first. Please send it on WhatsApp.</p>}
              <p>Prefer to ask us first? Open WhatsApp with this request ready to send.</p>
              <label className="cart-field cart-field--full" htmlFor="cart-summary">Your request</label>
              <textarea id="cart-summary" ref={summaryRef} className="cart-request__summary" readOnly rows={Math.min(18, 9 + items.length * 2)} value={summary} />
              <div className="cart-request__actions"><a className="cart-request__whatsapp" href={whatsappLink(summary)} target="_blank" rel="noopener noreferrer" onClick={(event) => { if (!validateRequest()) event.preventDefault(); }}>Continue in WhatsApp <span aria-hidden="true">↗</span></a><button type="button" onClick={copySummary}>Copy request <span aria-hidden="true">⧉</span></button></div>
              {copyMessage && <p className="cart-request__message" role="status">{copyMessage}</p>}
              <p className="cart-request__fineprint">WhatsApp opens with a prepared message; tap Send there to contact us. A WhatsApp request is confirmed after we reply. CHIP payments are confirmed only after the payment succeeds.</p>
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
