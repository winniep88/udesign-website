"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart, type CartItem } from "@/components/CartProvider";

type Fulfilment = "pickup" | "delivery";

function brandName(item: CartItem) {
  return item.brand === "moments" ? "UDESIGN MOMENTS" : "WINNIE CAKE TOPPER";
}

export default function CartPage() {
  const { items, count, ready, setQuantity, setNotes, removeItem, clearCart } = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [addressError, setAddressError] = useState("");
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);

  const summary = useMemo(() => {
    const lines = ["Hi UDESIGN, I'd like a quote for these custom pieces:", ""];
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${brandName(item)} — ${item.product} × ${item.quantity}`);
      lines.push(`   Details: ${item.notes.trim() || "Please discuss with me"}`);
    });
    lines.push("", `Fulfilment: ${fulfilment === "pickup" ? "Pickup in Kuchai Lama, Kuala Lumpur" : "Delivery"}`);
    if (fulfilment === "delivery") lines.push(`Delivery address: ${address.trim() || "To be provided"}`);
    if (preferredDate) lines.push(`Preferred date: ${preferredDate}`);
    if (extraNotes.trim()) lines.push(`Other notes: ${extraNotes.trim()}`);
    lines.push("", "Please confirm the design, item prices, delivery fee (if any), total and payment instructions. Thank you!");
    return lines.join("\n");
  }, [items, fulfilment, address, preferredDate, extraNotes]);

  async function copySummary() {
    setCopyMessage("");
    if (fulfilment === "delivery" && address.trim().length < 10) {
      setAddressError("Please enter your full delivery address before copying the request.");
      addressRef.current?.focus();
      return;
    }
    setAddressError("");

    try {
      await navigator.clipboard.writeText(summary);
      setCopyMessage("Copied. Open Instagram and paste this request into a message to UDESIGN.");
    } catch {
      summaryRef.current?.focus();
      summaryRef.current?.select();
      setCopyMessage("Select and copy the request below, then paste it into a message to UDESIGN.");
    }
  }

  return (
    <div className="cart-page">
      <SiteHeader active="cart" />
      <main>
        <section className="cart-hero shell">
          <p className="eyebrow">YOUR CUSTOM PIECES</p>
          <h1>Your cart<span>.</span></h1>
          <p>Bring pieces from UDESIGN MOMENTS and WINNIE CAKE TOPPER together in one request. We&apos;ll confirm your design and quote before payment.</p>
        </section>

        {!ready ? (
          <div className="cart-content shell" role="status">Loading your cart…</div>
        ) : items.length === 0 ? (
          <section className="cart-empty shell" aria-labelledby="empty-cart-title">
            <h2 id="empty-cart-title">Nothing in your cart yet.</h2>
            <p>Find something made for your moment, then add your details.</p>
            <div className="cart-empty__links">
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
                    <div className="cart-item__fields">
                      <div className="cart-item__quantity"><span>Quantity</span><div><button type="button" aria-label={`Decrease ${item.product} quantity`} disabled={item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)}>−</button><output aria-label={`${item.product} quantity`}>{item.quantity}</output><button type="button" aria-label={`Increase ${item.product} quantity`} disabled={item.quantity >= 99} onClick={() => setQuantity(item.id, item.quantity + 1)}>+</button></div></div>
                      <label className="cart-field">Personalisation or idea<textarea rows={3} maxLength={500} placeholder="Names, colours, theme, date, size or other details" value={item.notes} onChange={(event) => setNotes(item.id, event.target.value)} /></label>
                    </div>
                    <p className="cart-item__price">Item price <strong>Quote pending</strong></p>
                  </article>
                ))}
              </div>
              <div className="cart-continue"><Link href="/moments/">+ Add from Moments</Link><Link href="/winnie-cake-topper/">+ Add from Winnie Cake Topper</Link></div>
            </section>

            <section className="cart-checkout" aria-labelledby="cart-checkout-title">
              <div className="cart-section-heading"><div><span>02 / HOW YOU&apos;LL RECEIVE IT</span><h2 id="cart-checkout-title">Delivery or pickup</h2></div></div>
              <fieldset className="cart-fulfilment"><legend>Choose one</legend>
                <label className={fulfilment === "pickup" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => { setFulfilment("pickup"); setAddressError(""); }} /><span><strong>Pickup in Kuchai Lama</strong><small>Kuala Lumpur · Exact collection details shared after confirmation</small></span></label>
                <label className={fulfilment === "delivery" ? "is-selected" : ""}><input type="radio" name="fulfilment" checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} /><span><strong>Delivery</strong><small>We&apos;ll quote the delivery fee after seeing your address</small></span></label>
              </fieldset>
              {fulfilment === "delivery" && <label className="cart-field cart-field--full">Full delivery address<textarea ref={addressRef} rows={4} minLength={10} required placeholder="Street, building/unit, postcode, city and state" value={address} onChange={(event) => { setAddress(event.target.value); setAddressError(""); }} aria-invalid={Boolean(addressError)} aria-describedby={addressError ? "cart-address-error" : undefined} />{addressError && <span className="cart-field__error" id="cart-address-error" role="alert">{addressError}</span>}</label>}
              <div className="cart-checkout__extra"><label className="cart-field">Preferred date <span>(optional)</span><input type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} /></label><label className="cart-field">Anything else? <span>(optional)</span><textarea rows={3} maxLength={500} placeholder="Any other request we should know" value={extraNotes} onChange={(event) => setExtraNotes(event.target.value)} /></label></div>
              <div className="cart-quote"><h3>Estimated total</h3><strong>Quote pending</strong><p>Item prices {fulfilment === "delivery" ? "and delivery fee" : ""} will be confirmed with you. No payment is taken here.</p></div>
            </section>

            <section className="cart-request" aria-labelledby="cart-request-title">
              <div className="cart-section-heading"><div><span>03 / SEND YOUR REQUEST</span><h2 id="cart-request-title">Ready to ask?</h2></div></div>
              <p>Copy this request, then paste it into a message to UDESIGN on Instagram. We&apos;ll reply with the design, final price and payment instructions.</p>
              <label className="cart-field cart-field--full" htmlFor="cart-summary">Your request</label>
              <textarea id="cart-summary" ref={summaryRef} className="cart-request__summary" readOnly rows={Math.min(18, 9 + items.length * 2)} value={summary} />
              <div className="cart-request__actions"><button type="button" onClick={copySummary}>Copy order request <span aria-hidden="true">⧉</span></button><a href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">Open Instagram <span aria-hidden="true">↗</span></a></div>
              {copyMessage && <p className="cart-request__message" role="status">{copyMessage}</p>}
              <p className="cart-request__fineprint">Your order is not placed until UDESIGN confirms it with you. Delivery details entered here stay in this open page and are included only if you copy the request.</p>
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
