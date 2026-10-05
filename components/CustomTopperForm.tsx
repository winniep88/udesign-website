"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import { topperLineLabel, topperSizes, type TopperLineCount } from "@/lib/topper";

type Material = "cardstock" | "acrylic" | "wood";

const colours: Record<Material, string[]> = {
  cardstock: ["Glitter Black", "Glitter Dark Blue", "Glitter Gold", "Glitter Pink", "Glitter Purple", "Glitter Silver", "Matte Black", "Shiny Gold", "Shiny Rose Gold", "Shiny Silver"],
  acrylic: ["Black", "Blue", "Green", "Grey", "Matte gold", "Mirror Gold", "Mirror Rose Gold", "Mirror Silver", "Pink", "Red", "Yellow"],
  wood: ["Natural wood", "Other finish — confirm availability"],
};

export function CustomTopperForm({ eventName, lineCount }: { eventName: string; lineCount: TopperLineCount }) {
  const { addItem, ready } = useCart();
  const [material, setMaterial] = useState<Material>("cardstock");
  const [colour, setColour] = useState(colours.cardstock[0]);
  const [requestedWoodFinish, setRequestedWoodFinish] = useState("");
  const [sizeCm, setSizeCm] = useState(lineCount === 3 ? 13 : 10);
  const [lines, setLines] = useState(["", "", ""]);
  const [eventDate, setEventDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState("");
  const [added, setAdded] = useState(false);
  const availableSizes = topperSizes.filter((size) => lineCount !== 3 || size.cm >= 13);

  function chooseMaterial(value: Material) {
    setMaterial(value);
    setColour(colours[value][0]);
    setRequestedWoodFinish("");
    setAdded(false);
  }

  function changeLine(index: number, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? value : line));
    setAdded(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || lines.slice(0, lineCount).some((line) => !line.trim())) return;
    if (lineCount === 3 && sizeCm < 13) return;
    if (material === "wood" && colour !== "Natural wood" && !requestedWoodFinish.trim()) return;
    const personalisation = [
      `Event: ${eventName}`,
      `Wording (${topperLineLabel(lineCount)}): ${lines.slice(0, lineCount).map((line) => line.trim()).join(" / ")}`,
      `Material: ${material[0].toUpperCase()}${material.slice(1)}`,
      `Colour or finish: ${colour}`,
      material === "wood" && colour !== "Natural wood" ? `Requested wood finish: ${requestedWoodFinish.trim()}` : "",
      `Size: ${sizeCm} cm / ${topperSizes.find((size) => size.cm === sizeCm)?.inch} inch`,
      eventDate ? `Event date: ${eventDate}` : "",
      details.trim() ? `Other details: ${details.trim()}` : "",
    ].filter(Boolean).join("\n");
    addItem({
      brand: "winnie",
      product: `${eventName} Cake Topper — ${topperLineLabel(lineCount)}`,
      quantity,
      notes: personalisation,
    });
    setAdded(true);
  }

  return (
    <form className="custom-topper-form" id="customise" onSubmit={submit}>
      <fieldset className="custom-topper-form__wording">
        <legend>1. Enter your topper wording</legend>
        <p className="custom-topper-form__intro">Type the words exactly as you want them to appear. We&apos;ll send a digital mock-up on WhatsApp for your approval.</p>
        {Array.from({ length: lineCount }, (_, index) => <label className="custom-topper-form__field" key={index}>Line {index + 1}
          <input type="text" maxLength={60} required value={lines[index]} onChange={(event) => changeLine(index, event.target.value)} placeholder={index === 0 ? "e.g. Happy Birthday" : index === 1 ? "e.g. Olivia" : "e.g. Three"} />
        </label>)}
      </fieldset>

      <fieldset className="custom-topper-form__choices">
        <legend>2. Choose your material</legend>
        <div className="custom-topper-form__choice-grid custom-topper-form__choice-grid--three">
          {(["cardstock", "acrylic", "wood"] as const).map((option) => <label className={material === option ? "is-selected" : ""} key={option}>
            <input type="radio" name="material" checked={material === option} onChange={() => chooseMaterial(option)} />
            <strong>{option === "cardstock" ? "Cardstock" : option === "acrylic" ? "Acrylic" : "Wood"}</strong>
          </label>)}
        </div>
      </fieldset>

      <label className="custom-topper-form__field">3. {material === "wood" ? "Wood finish" : "Colour or finish"}
        <select value={colour} onChange={(event) => { setColour(event.target.value); setAdded(false); }}>
          {colours[material].map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <p className="custom-topper-form__hint">The choices change with the material. We&apos;ll confirm the exact finish with you before production.</p>
      {material === "wood" && colour !== "Natural wood" && <label className="custom-topper-form__field">Preferred wood finish
        <input type="text" required maxLength={45} value={requestedWoodFinish} onChange={(event) => { setRequestedWoodFinish(event.target.value); setAdded(false); }} placeholder="Describe the colour or shade you want" />
      </label>}

      <fieldset className="custom-topper-form__choices">
        <legend>4. Choose the topper width</legend>
        <div className="custom-topper-form__size-grid">
          {availableSizes.map((size) => <label className={sizeCm === size.cm ? "is-selected" : ""} key={size.cm}>
            <input type="radio" name="size" checked={sizeCm === size.cm} onChange={() => { setSizeCm(size.cm); setAdded(false); }} />
            <strong>{size.cm} cm</strong><small>{size.inch} inch</small>
          </label>)}
        </div>
        {lineCount === 3 && <p className="custom-topper-form__size-note">Three-line toppers start at 13 cm / 5 inch.</p>}
      </fieldset>

      <div className="custom-topper-form__extra">
        <label className="custom-topper-form__field">Event date <span>Optional</span>
          <input type="date" value={eventDate} onChange={(event) => { setEventDate(event.target.value); setAdded(false); }} />
        </label>
        <label className="custom-topper-form__field">Quantity
          <input type="number" min={1} max={99} required value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setAdded(false); }} />
        </label>
      </div>
      <label className="custom-topper-form__field">Other design details <span>Optional</span>
        <textarea rows={3} maxLength={120} value={details} onChange={(event) => { setDetails(event.target.value); setAdded(false); }} placeholder="Theme, font style or other requests" />
      </label>
      <p className="custom-topper-form__hint">Have a reference photo? You can attach it in WhatsApp after sending your cart request.</p>
      <div className="custom-topper-form__total"><span>Item price</span><strong>To confirm</strong></div>
      <p className="custom-topper-form__hint">We&apos;ll confirm the price and design on WhatsApp before payment. The price table is being completed.</p>
      <button className="custom-topper-form__submit" type="submit" disabled={!ready}>Add to cart <span aria-hidden="true">＋</span></button>
      {added && <p className="custom-topper-form__added" role="status">Added to cart. <Link href="/cart/">Choose delivery or pickup →</Link></p>}
    </form>
  );
}
