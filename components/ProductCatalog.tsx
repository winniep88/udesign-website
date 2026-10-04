"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import { formatRinggit, productPriceRange, type Brand, type CatalogProduct } from "@/lib/catalog";

const BRAND_LABELS: Record<Brand, string> = {
  projects: "UDESIGN PROJECTS",
  moments: "UDESIGN MOMENTS",
  winnie: "WINNIE CAKE TOPPER",
};

function ProductAddButton({ product }: { product: CatalogProduct }) {
  const { addItem, ready } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const available = product.variants.filter((variant) => variant.available);
  const [variantId, setVariantId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);
  const selected = available.find((variant) => variant.id === variantId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    addItem({
      brand: product.brand,
      product: product.name,
      productId: product.id,
      variantId: selected.id,
      quantity,
      notes,
    });
    setQuantity(1);
    setNotes("");
    setAdded(true);
    dialogRef.current?.close();
  }

  if (!available.length) return <p className="catalog-card__unavailable">Temporarily unavailable</p>;

  return (
    <>
      <button type="button" className="catalog-card__add" disabled={!ready} onClick={() => { setAdded(false); dialogRef.current?.showModal(); }}>
        Choose option <span aria-hidden="true">＋</span>
      </button>
      {added && <p className="catalog-card__added" role="status">Added to cart. <Link href="/cart/">View cart</Link></p>}
      <dialog ref={dialogRef} className="add-to-cart__dialog" aria-labelledby={titleId}>
        <form onSubmit={submit}>
          <div className="add-to-cart__dialog-top">
            <p className="add-to-cart__eyebrow">{BRAND_LABELS[product.brand]}</p>
            <button type="button" className="add-to-cart__close" aria-label="Close" onClick={() => dialogRef.current?.close()}>×</button>
          </div>
          <h2 id={titleId}>{product.name}</h2>
          <p className="add-to-cart__intro">Choose the option you want, then add any name, colour or other personalisation details.</p>
          <label className="add-to-cart__label" htmlFor={`${titleId}-option`}>Size or option</label>
          <select className="add-to-cart__input" id={`${titleId}-option`} value={variantId} onChange={(event) => setVariantId(event.target.value)} required>
            {available.map((variant) => <option value={variant.id} key={variant.id}>{variant.name} — {formatRinggit(variant.priceSen)}</option>)}
          </select>
          <label className="add-to-cart__label" htmlFor={`${titleId}-quantity`}>Quantity</label>
          <input className="add-to-cart__input add-to-cart__quantity" id={`${titleId}-quantity`} type="number" min="1" max="99" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
          <label className="add-to-cart__label" htmlFor={`${titleId}-notes`}>Personalisation <span>(optional)</span></label>
          <textarea className="add-to-cart__input" id={`${titleId}-notes`} rows={4} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Name, wording, colour or other details" />
          <p className="add-to-cart__quote-note">Item price: {selected ? formatRinggit(selected.priceSen * Math.min(99, Math.max(1, quantity || 1))) : "Choose an option"}. Delivery fee, if any, is confirmed before payment.</p>
          <button className="add-to-cart__submit" type="submit">Add to cart <span aria-hidden="true">→</span></button>
        </form>
      </dialog>
    </>
  );
}

export function ProductCatalog({ brand, products }: { brand: Brand; products: CatalogProduct[] }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const text = `${product.name} ${product.category}`.toLocaleLowerCase();
    return matchesCategory && text.includes(query.trim().toLocaleLowerCase());
  }), [products, category, query]);
  const visible = filtered.slice(0, visibleCount);

  return (
    <section className={`product-catalog product-catalog--${brand}`} id="products" aria-labelledby={`${brand}-products-title`}>
      <div className="shell">
        <div className="product-catalog__heading">
          <div><p className="eyebrow">SHOP THE COLLECTION</p><h2 id={`${brand}-products-title`}>Explore the pieces.</h2></div>
          <p>Choose a listed size or option at its displayed price. We&apos;ll confirm availability and any delivery fee before payment.</p>
        </div>
        <div className="product-catalog__tools">
          <label>Find a product<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }} placeholder="Search products" /></label>
          <label>Category<select value={category} onChange={(event) => { setCategory(event.target.value); setVisibleCount(24); }}><option value="all">All categories</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
          <p role="status">{filtered.length} {filtered.length === 1 ? "product" : "products"}</p>
        </div>
        {filtered.length ? (
          <>
            <div className="product-catalog__grid">
              {visible.map((product) => {
                const { min, max } = productPriceRange(product);
                return <article className="catalog-card" key={product.id}>
                  <p className="catalog-card__category">{product.category}</p>
                  <h3>{product.name}</h3>
                  <p className="catalog-card__options">{product.variants.filter((variant) => variant.available).length} {product.variants.filter((variant) => variant.available).length === 1 ? "option" : "options"}</p>
                  <p className="catalog-card__price">{min === max ? formatRinggit(min) : `From ${formatRinggit(min)}`}</p>
                  {brand === "winnie" ? (
                    <Link className="catalog-card__add" href={`/winnie-cake-topper/${product.id}/`}>View details &amp; add to cart <span aria-hidden="true">→</span></Link>
                  ) : <ProductAddButton product={product} />}
                </article>;
              })}
            </div>
            {visibleCount < filtered.length && <button className="product-catalog__more" type="button" onClick={() => setVisibleCount((count) => count + 24)}>Show more products</button>}
          </>
        ) : <p className="product-catalog__empty">No products match that search. Try another word or category.</p>}
      </div>
    </section>
  );
}
