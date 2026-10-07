"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart, type CartItem } from "@/components/CartProvider";
import { findVariant, formatRinggit } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";
import { topperEvent, topperSelectionPriceSen, topperSizes } from "@/lib/topper";

type Fulfilment = "pickup" | "delivery";
const deliveryRegions = {
  west: { label: "West Malaysia", feeSen: 800, transit: "3 business days" },
  east: { label: "East Malaysia", feeSen: 1500, transit: "8–10 business days" },
  singapore: { label: "Singapore", feeSen: 2000, transit: "4 business days" },
} as const;
type DeliveryRegion = keyof typeof deliveryRegions;

function brandName(item: CartItem) {
  if (item.brand === "projects") return "UDESIGN PROJECTS";
  if (item.brand === "moments") return "UDESIGN MOMENTS";
  return "WINNIE CAKE TOPPER";
}

function selectedOption(item: CartItem) {
  return item.productId && item.variantId ? findVariant(item.productId, item.variantId) : undefined;
}

function itemUnitPriceSen(item: CartItem) {
  if (item.topper) return topperSelectionPriceSen(item.topper);
  return selectedOption(item)?.priceSen;
}

function topperDetails(item: CartItem) {
  if (!item.topper) return [];
  const choice = item.topper;
  const inch = topperSizes.find((size) => size.cm === choice.sizeCm)?.inch;
  return [
    `Event: ${topperEvent(choice.eventSlug)?.name ?? choice.eventSlug}`,
    `Wording: ${choice.wording.join(" / ")}`,
    `Material: ${choice.material[0].toUpperCase()}${choice.material.slice(1)}`,
    `Colour or finish: ${choice.finish}`,
    `Width: ${choice.sizeCm} cm${inch ? ` / ${inch} inch` : ""}`,
    ...(choice.details ? [`Design details: ${choice.details}`] : []),
  ];
}

export default function CartPage() {
  const { items, count, ready, setQuantity, setNotes, removeItem, clearCart } = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const [deliveryRegion, setDeliveryRegion] = useState<DeliveryRegion | "">("");
  const [address, setAddress] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [paymentAvailable, setPaymentAvailable] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressError, setAddressError] = useState("");
  const [regionError, setRegionError] = useState("");
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const regionRef = useRef<HTMLSelectElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/checkout/status/", { cache: "no-store" }).then((response) => response.json()).then((data) => setPaymentAvailable(data.available === true)).catch(() => setPaymentAvailable(false));
  }, []);

  const pricing = useMemo(() => items.reduce((result, item) => {
    const unitPriceSen = itemUnitPriceSen(item);
    if (unitPriceSen !== undefined) result.subtotalSen += unitPriceSen * item.quantity;
    else result.needsQuote = true;
    return result;
  }, { subtotalSen: 0, needsQuote: false }), [items]);
  const cakeTopperOnly = items.length > 0 && items.every((item) => item.brand === "winnie");
  const region = deliveryRegion ? deliveryRegions[deliveryRegion] : null;
  const deliveryFeeSen = fulfilment === "delivery" && cakeTopperOnly && region ? region.feeSen : 0;
  const deliveryNeedsQuote = fulfilment === "delivery" && !cakeTopperOnly;
  const totalToConfirm = pricing.needsQuote || deliveryNeedsQuote || (fulfilment === "delivery" && !region);
  const itemSubtotalText = pricing.needsQuote
    ? pricing.subtotalSen ? `${formatRinggit(pricing.subtotalSen)} + item price to confirm` : "To confirm"
    : formatRinggit(pricing.subtotalSen);

  const summary = useMemo(() => {
    const lines = ["Hi UDESIGN, I'd like to request these items:", ""];
    items.forEach((item, index) => {
      const option = selectedOption(item);
      const unitPriceSen = itemUnitPriceSen(item);
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
      lines.push(`Delivery region: ${region?.label ?? "To be selected"}`);
      lines.push(`Delivery fee: ${cakeTopperOnly && region ? formatRinggit(region.feeSen) : "To confirm for this cart"}`);
      if (cakeTopperOnly && region) lines.push(`Estimated transit after dispatch: ${region.transit}`);
      lines.push(`Delivery address: ${address.trim() || "To be provided"}`);
    }
    lines.push(`Estimated total: ${totalToConfirm ? "To confirm" : formatRinggit(pricing.subtotalSen + deliveryFeeSen)}`);
    if (extraNotes.trim()) lines.push(`Other notes: ${extraNotes.trim()}`);
    lines.push("", "Please confirm the design, ready date, final total and payment instructions. Thank you!");
    return lines.join("\n");
  }, [items, pricing, itemSubtotalText, fulfilment, region, cakeTopperOnly, totalToConfirm, deliveryFeeSen, address, extraNotes]);

  function validateRequest() {
    if (fulfilment === "delivery" && !deliveryRegion) {
      setRegionError("Please choose a delivery region first.");
      regionRef.current?.focus();
      return false;
    }
    setRegionError("");
    if (fulfilment === "delivery" && address.trim().length < 10) {
      setAddressError("Please enter your full delivery address first.");
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
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) { setPaymentError("Please enter your name, email and WhatsApp number."); return; }
    setPaying(true);
    try {
      const response = await fetch("/api/checkout/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items, fulfilment, region: deliveryRegion, address, extraNotes, customer: { name: customerName, email: customerEmail, phone: customerPhone } }) });
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
                    {selectedOption(item) && <p className="cart-item__option"><span>Selected option</span><strong>{selectedOption(item)!.name}</strong></p>}
                    {item.topper && <div className="cart-item__topper-details">{topperDetails(item).map((detail) => <p key={detail}>{detail}</p>)}</div>}
                    {item.referenceImage && <p className="cart-item__reference">Reference image: <a href={item.referenceImage.url} target="_blank" rel="noopener noreferrer">{item.referenceImage.name} ↗</a></p>}
                    <div className="cart-item__fields">
                      <div className="cart-item__quantity"><span>Quantity</span><div><button type="button" aria-label={`Decrease ${item.product} quantity`} disabled={item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)}>−</button><output aria-label={`${item.product} quantity`}>{item.quantity}</output><button type="button" aria-label={`Increase ${item.product} quantity`} disabled={item.quantity >= 99} onClick={() => setQuantity(item.id, item.quantity + 1)}>+</button></div></div>
                      <label className="cart-field">Personalisation or idea<textarea rows={3} maxLength={1000} placeholder="Names, colours, theme, size or other details" value={item.notes} onChange={(event) => setNotes(item.id, event.target.value)} /></label>
                    </div>
                    <p className="cart-item__price"><span>{itemUnitPriceSen(item) !== undefined ? `Unit price ${formatRinggit(itemUnitPriceSen(item)!)}` : "Custom item price"}</span><strong>{itemUnitPriceSen(item) !== undefined ? formatRinggit(itemUnitPriceSen(item)! * item.quantity) : "To confirm"}</strong></p>
                  </article>
                ))}
              </div>
              <div className="cart-continue"><Link href="/projects/">+ Add from Projects</Link><Link href="/moments/">+ Add from Moments</Link><Link href="/winnie-cake-topper/">+ Add from Winnie Cake Topper</Link></div>
            </section>

            <section className="cart-checkout" aria-labelledby="cart-checkout-title">
              <div className="cart-section-heading"><div><span>02 / HOW YOU&apos;LL RECEIVE IT</span><h2 id="cart-checkout-title">Delivery or pickup</h2></div></div>
              <fieldset className="cart-fulfilment"><legend>Choose one</legend>
                <label className={fulfilment === "pickup" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => { setFulfilment("pickup"); setAddressError(""); setRegionError(""); }} /><span><strong>Pickup in Kuchai Lama</strong><small>Kuala Lumpur · Exact collection details shared after confirmation</small></span></label>
                <label className={fulfilment === "delivery" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} /><span><strong>Delivery</strong><small>Choose a region and enter your full address</small></span></label>
              </fieldset>
              <p className="cart-urgent">Need it urgently? <a href={whatsappLink("Hi UDESIGN, I have an urgent order and can pick it up in Kuchai Lama, KL. Could you confirm if it is possible?")} target="_blank" rel="noopener noreferrer">Contact us on WhatsApp ↗</a> Urgent orders are for pickup in Kuchai Lama, KL, once we confirm availability.</p>
              {fulfilment === "delivery" && <div className="cart-delivery-fields">
                <label className="cart-field cart-delivery-region">Delivery region
                  <select ref={regionRef} value={deliveryRegion} required onChange={(event) => { setDeliveryRegion(event.target.value as DeliveryRegion | ""); setRegionError(""); }} aria-invalid={Boolean(regionError)} aria-describedby={regionError ? "cart-region-error" : undefined}>
                    <option value="">Choose a region</option>
                    {Object.entries(deliveryRegions).map(([key, option]) => <option value={key} key={key}>{option.label} — {cakeTopperOnly ? `${formatRinggit(option.feeSen)} · ${option.transit} after dispatch` : "delivery quote to confirm"}</option>)}
                  </select>
                  {regionError && <span className="cart-field__error" id="cart-region-error" role="alert">{regionError}</span>}
                </label>
                <label className="cart-field cart-field--full">Full delivery address<textarea ref={addressRef} rows={4} minLength={10} required placeholder={deliveryRegion === "singapore" ? "Street, building/unit and postal code, Singapore" : "Street, building/unit, postcode, city and state"} value={address} onChange={(event) => { setAddress(event.target.value); setAddressError(""); }} aria-invalid={Boolean(addressError)} aria-describedby={addressError ? "cart-address-error" : undefined} />{addressError && <span className="cart-field__error" id="cart-address-error" role="alert">{addressError}</span>}</label>
                <p className="cart-delivery-fields__note">{cakeTopperOnly ? "Delivery fees are for a cake topper order. Transit times are estimates after dispatch." : "This cart includes other products, so we&apos;ll confirm the delivery fee and timing on WhatsApp."}</p>
              </div>}
              <div className="cart-checkout__extra"><label className="cart-field">Anything else? <span>(optional)</span><textarea rows={3} maxLength={500} placeholder="Any other request we should know" value={extraNotes} onChange={(event) => setExtraNotes(event.target.value)} /></label></div>
              <div className="cart-quote">
                <div className="cart-quote__row"><h3>Item subtotal</h3><strong>{itemSubtotalText}</strong></div>
                {fulfilment === "delivery" && <div className="cart-quote__row"><span>Delivery</span><strong>{cakeTopperOnly && region ? formatRinggit(region.feeSen) : "To confirm"}</strong></div>}
                <div className="cart-quote__row cart-quote__row--total"><span>Estimated total</span><strong>{totalToConfirm ? "To confirm" : formatRinggit(pricing.subtotalSen + deliveryFeeSen)}</strong></div>
                <p>{fulfilment === "delivery" && cakeTopperOnly && region ? `${region.label}: estimated ${region.transit} after dispatch. ` : fulfilment === "pickup" ? "Pickup in Kuchai Lama, Kuala Lumpur. " : "Delivery timing to confirm. "}We&apos;ll send a design confirmation on WhatsApp. If we need to change or cannot make an order, we&apos;ll contact you first and agree on a replacement or refund.</p>
              </div>
            </section>

            <section className="cart-request" aria-labelledby="cart-request-title">
              <div className="cart-section-heading"><div><span>03 / PLACE YOUR ORDER</span><h2 id="cart-request-title">Ready to order?</h2></div></div>
              {paymentAvailable && !totalToConfirm && <div className="cart-delivery-fields">
                <p>Pay {formatRinggit(pricing.subtotalSen + deliveryFeeSen)} now through CHIP. You&apos;ll enter payment details on CHIP&apos;s secure page.</p>
                <label className="cart-field">Full name<input type="text" value={customerName} maxLength={100} autoComplete="name" onChange={(event) => setCustomerName(event.target.value)} /></label>
                <label className="cart-field">Email<input type="email" value={customerEmail} maxLength={150} autoComplete="email" onChange={(event) => setCustomerEmail(event.target.value)} /></label>
                <label className="cart-field">WhatsApp number<input type="tel" value={customerPhone} maxLength={30} autoComplete="tel" onChange={(event) => setCustomerPhone(event.target.value)} /></label>
                <button className="cart-request__whatsapp" type="button" disabled={paying} onClick={payNow}>{paying ? "Opening secure checkout…" : `Pay ${formatRinggit(pricing.subtotalSen + deliveryFeeSen)} with CHIP ↗`}</button>
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
