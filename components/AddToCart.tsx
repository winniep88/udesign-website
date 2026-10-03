"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { useCart, type CartBrand } from "./CartProvider";

type AddToCartProps = {
  brand: CartBrand;
  product: string;
  className?: string;
};

export function AddToCart({ brand, product, className = "" }: AddToCartProps) {
  const { addItem, ready } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addItem({ brand, product, quantity, notes });
    setQuantity(1);
    setNotes("");
    setAdded(true);
    dialogRef.current?.close();
  }

  return (
    <div className={`add-to-cart add-to-cart--${brand} ${className}`.trim()}>
      <button
        className="add-to-cart__trigger"
        type="button"
        disabled={!ready}
        onClick={() => { setAdded(false); dialogRef.current?.showModal(); }}
      >
        Add to cart <span aria-hidden="true">＋</span>
      </button>
      {added && <p className="add-to-cart__success" role="status">Added! <Link href="/cart/">View cart →</Link></p>}

      <dialog className="add-to-cart__dialog" ref={dialogRef} aria-labelledby={titleId}>
        <form onSubmit={submit}>
          <div className="add-to-cart__dialog-top">
            <p className="add-to-cart__eyebrow">{brand === "moments" ? "UDESIGN MOMENTS" : "WINNIE CAKE TOPPER"}</p>
            <button type="button" className="add-to-cart__close" aria-label="Close" onClick={() => dialogRef.current?.close()}>×</button>
          </div>
          <h2 id={titleId}>Add {product.toLowerCase()}</h2>
          <p className="add-to-cart__intro">Tell us what you have in mind. We&apos;ll confirm the design and price with you before payment.</p>
          <label className="add-to-cart__label" htmlFor={`${titleId}-quantity`}>Quantity</label>
          <input
            id={`${titleId}-quantity`}
            className="add-to-cart__input add-to-cart__quantity"
            type="number"
            min="1"
            max="99"
            required
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
          <label className="add-to-cart__label" htmlFor={`${titleId}-notes`}>Personalisation or idea <span>(optional)</span></label>
          <textarea
            id={`${titleId}-notes`}
            className="add-to-cart__input"
            rows={4}
            maxLength={500}
            placeholder="Names, colours, theme, date, size or any details you know so far"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <p className="add-to-cart__quote-note">Price: quote pending · No payment is taken now</p>
          <button className="add-to-cart__submit" type="submit">Add to cart <span aria-hidden="true">→</span></button>
        </form>
      </dialog>
    </div>
  );
}
