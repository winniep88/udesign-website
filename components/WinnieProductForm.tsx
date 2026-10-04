"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import { formatRinggit, type CatalogProduct, type CatalogVariant } from "@/lib/catalog";

type Option = { variant: CatalogVariant; finish: string; size: string };

function parseOption(variant: CatalogVariant): Option {
  const comma = variant.name.indexOf(",");
  return {
    variant,
    finish: comma === -1 ? variant.name.trim() : variant.name.slice(0, comma).trim(),
    size: comma === -1 ? "" : variant.name.slice(comma + 1).trim(),
  };
}

function byPriceThenName(a: Option, b: Option) {
  return a.variant.priceSen - b.variant.priceSen || a.variant.name.localeCompare(b.variant.name, "en", { numeric: true });
}

export function WinnieProductForm({ product }: { product: CatalogProduct }) {
  const { addItem, ready } = useCart();
  const options = useMemo(() => product.variants.filter((item) => item.available).map(parseOption), [product]);
  const cheapest = useMemo(() => [...options].sort(byPriceThenName)[0], [options]);
  const [variantId, setVariantId] = useState(cheapest?.variant.id ?? "");
  const [wording, setWording] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selected = options.find((item) => item.variant.id === variantId) ?? cheapest;
  const finishes = Array.from(new Set(options.map((item) => item.finish))).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const sizes = options.filter((item) => item.finish === selected?.finish && item.size).sort((a, b) => a.size.localeCompare(b.size, "en", { numeric: true }));
  const showFinish = finishes.length > 1;
  const showSize = sizes.length > 1;
  const needsWording = product.id === "4911844020" || product.id === "4306939371";
  const priceSen = selected?.variant.priceSen ?? 0;

  function chooseFinish(finish: string) {
    const first = options.filter((item) => item.finish === finish).sort(byPriceThenName)[0];
    if (first) setVariantId(first.variant.id);
    setAdded(false);
  }

  function chooseSize(size: string) {
    const match = options.find((item) => item.finish === selected?.finish && item.size === size);
    if (match) setVariantId(match.variant.id);
    setAdded(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !ready) return;
    const personalisation = [
      wording.trim() ? `Topper text or idea: ${wording.trim()}` : "Topper wording: to confirm with studio",
      eventDate ? `Event date: ${eventDate}` : "",
      notes.trim() ? `Other details: ${notes.trim()}` : "",
    ].filter(Boolean).join("\n");
    addItem({
      brand: "winnie",
      product: product.name,
      productId: product.id,
      variantId: selected.variant.id,
      quantity,
      notes: personalisation,
    });
    setAdded(true);
  }

  if (!selected) return <p>This topper is temporarily unavailable. Please contact us for a custom request.</p>;

  return (
    <form className="winnie-product-form" onSubmit={submit}>
      <div className="winnie-product-form__intro">
        <p className="eyebrow">MAKE IT YOURS</p>
        <h2>Choose your details.</h2>
        <p>We&apos;ll confirm the design and ready date with you on WhatsApp before payment.</p>
      </div>

      {showFinish && <label className="winnie-product-form__field">Colour or finish
        <select value={selected.finish} onChange={(event) => chooseFinish(event.target.value)}>
          {finishes.map((finish) => <option key={finish} value={finish}>{finish}</option>)}
        </select>
      </label>}
      {showSize && <label className="winnie-product-form__field">Size
        <select value={selected.size} onChange={(event) => chooseSize(event.target.value)}>
          {sizes.map((option) => <option key={option.variant.id} value={option.size}>{option.size} — {formatRinggit(option.variant.priceSen)}</option>)}
        </select>
      </label>}
      {!showFinish && !showSize && <p className="winnie-product-form__selected">Option: <strong>{selected.variant.name}</strong></p>}
      {showFinish && !showSize && selected.size && <p className="winnie-product-form__selected">Size: <strong>{selected.size}</strong></p>}

      <label className="winnie-product-form__field">Name, wording or design idea {needsWording ? <strong>Required</strong> : <span>Optional</span>}
        <textarea rows={3} maxLength={160} required={needsWording} value={wording} onChange={(event) => { setWording(event.target.value); setAdded(false); }} placeholder="Type exactly what you want on the topper, or describe your theme" />
      </label>
      <div className="winnie-product-form__two">
        <label className="winnie-product-form__field">Event date <span>Optional</span>
          <input type="date" value={eventDate} onChange={(event) => { setEventDate(event.target.value); setAdded(false); }} />
        </label>
        <label className="winnie-product-form__field">Quantity
          <input type="number" min={1} max={99} required value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setAdded(false); }} />
        </label>
      </div>
      <label className="winnie-product-form__field">Other details <span>Optional</span>
        <textarea rows={3} maxLength={250} value={notes} onChange={(event) => { setNotes(event.target.value); setAdded(false); }} placeholder="Tell us the occasion, style or anything else we should know" />
      </label>
      <p className="winnie-product-form__reference">Have a reference photo? Send it to us in WhatsApp after you send your cart request.</p>
      <div className="winnie-product-form__total"><span>Item total</span><strong aria-live="polite">{formatRinggit(priceSen * Math.min(99, Math.max(1, quantity || 1)))}</strong></div>
      <p className="winnie-product-form__fees">Delivery fee, if any, is confirmed before payment. Kuchai Lama pickup is available at cart.</p>
      <button className="winnie-product-form__submit" disabled={!ready} type="submit">Add to cart <span aria-hidden="true">＋</span></button>
      {added && <p className="winnie-product-form__success" role="status">Added to cart. <Link href="/cart/">View your cart →</Link></p>}
    </form>
  );
}
