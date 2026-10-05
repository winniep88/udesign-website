"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";

type Material = "acrylic" | "cardstock" | "wood";
type LineCount = 2 | 3;

const colours: Record<Material, string[]> = {
  acrylic: ["Black", "Blue", "Green", "Grey", "Matte gold", "Mirror Gold", "Mirror Rose Gold", "Mirror Silver", "Pink", "Red", "Yellow"],
  cardstock: ["Glitter Black", "Glitter Dark Blue", "Glitter Gold", "Glitter Pink", "Glitter Purple", "Glitter Silver", "Matte Black", "Shiny Gold", "Shiny Rose Gold", "Shiny Silver"],
  wood: ["Natural wood", "Other finish — confirm availability"],
};

const sizes = [
  { cm: 10, inch: 4 },
  { cm: 13, inch: 5 },
  { cm: 15, inch: 6 },
  { cm: 18, inch: 7 },
  { cm: 20, inch: 8 },
];

export function CustomTopperForm() {
  const { addItem, ready } = useCart();
  const [lineCount, setLineCount] = useState<LineCount>(2);
  const [material, setMaterial] = useState<Material>("acrylic");
  const [colour, setColour] = useState(colours.acrylic[0]);
  const [requestedWoodFinish, setRequestedWoodFinish] = useState("");
  const [sizeCm, setSizeCm] = useState(13);
  const [lines, setLines] = useState(["", "", ""]);
  const [eventDate, setEventDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState("");
  const [added, setAdded] = useState(false);

  function chooseLineCount(value: LineCount) {
    setLineCount(value);
    if (value === 3 && sizeCm < 13) setSizeCm(13);
    setAdded(false);
  }

  function chooseMaterial(value: Material) {
    setMaterial(value);
    setColour(colours[value][0]);
    setAdded(false);
  }

  function changeLine(index: number, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? value : line));
    setAdded(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || lines.slice(0, lineCount).some((line) => !line.trim())) return;
    if (material === "wood" && colour !== "Natural wood" && !requestedWoodFinish.trim()) return;
    const personalisation = [
      `Wording (${lineCount} lines): ${lines.slice(0, lineCount).map((line) => line.trim()).join(" / ")}`,
      `Material: ${material[0].toUpperCase()}${material.slice(1)}`,
      `Colour or finish: ${colour}`,
      material === "wood" && colour !== "Natural wood" ? `Requested wood finish: ${requestedWoodFinish.trim()}` : "",
      `Size: ${sizeCm} cm / ${sizes.find((size) => size.cm === sizeCm)?.inch} inch`,
      eventDate ? `Event date: ${eventDate}` : "",
      details.trim() ? `Other details: ${details.trim()}` : "",
    ].filter(Boolean).join("\n");
    addItem({
      brand: "winnie",
      product: "Custom 2 or 3 Line Cake Topper",
      quantity,
      notes: personalisation,
    });
    setAdded(true);
  }

  return (
    <form className="custom-topper-form" id="customise" onSubmit={submit}>
      <fieldset className="custom-topper-form__choices">
        <legend>1. How many lines?</legend>
        <div className="custom-topper-form__choice-grid">
          {([2, 3] as const).map((count) => <label className={lineCount === count ? "is-selected" : ""} key={count}>
            <input type="radio" name="line-count" checked={lineCount === count} onChange={() => chooseLineCount(count)} />
            <span><strong>{count} lines</strong><small>{count === 2 ? "10 cm / 4 inch and above" : "13 cm / 5 inch and above"}</small></span>
          </label>)}
        </div>
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
      <p className="custom-topper-form__hint">Acrylic and cardstock finishes come from the current UDESIGN catalog. We&apos;ll confirm your chosen finish, including wood, before making it.</p>
      {material === "wood" && colour !== "Natural wood" && <label className="custom-topper-form__field">Preferred wood finish
        <input type="text" required maxLength={45} value={requestedWoodFinish} onChange={(event) => { setRequestedWoodFinish(event.target.value); setAdded(false); }} placeholder="Describe the colour or shade you want" />
      </label>}

      <fieldset className="custom-topper-form__choices">
        <legend>4. Choose the topper width</legend>
        <div className="custom-topper-form__size-grid">
          {sizes.filter((size) => lineCount === 2 || size.cm >= 13).map((size) => <label className={sizeCm === size.cm ? "is-selected" : ""} key={size.cm}>
            <input type="radio" name="size" checked={sizeCm === size.cm} onChange={() => { setSizeCm(size.cm); setAdded(false); }} />
            <strong>{size.cm} cm</strong><small>{size.inch} inch</small>
          </label>)}
        </div>
        {lineCount === 3 && <p className="custom-topper-form__hint">Three-line toppers start at 13 cm / 5 inch.</p>}
      </fieldset>

      <fieldset className="custom-topper-form__wording">
        <legend>5. Type the wording exactly as you want it</legend>
        {Array.from({ length: lineCount }, (_, index) => <label className="custom-topper-form__field" key={index}>Line {index + 1}
          <input type="text" maxLength={60} required value={lines[index]} onChange={(event) => changeLine(index, event.target.value)} placeholder={index === 0 ? "e.g. Happy Birthday" : index === 1 ? "e.g. Olivia" : "e.g. Three"} />
        </label>)}
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
        <textarea rows={3} maxLength={120} value={details} onChange={(event) => { setDetails(event.target.value); setAdded(false); }} placeholder="Theme, font style, or a different wood finish" />
      </label>
      <p className="custom-topper-form__hint">Have a reference picture? Send it in WhatsApp after your cart request.</p>
      <div className="custom-topper-form__total"><span>Item price</span><strong>To confirm</strong></div>
      <p className="custom-topper-form__hint">The current price list does not cover every line, material and size combination. We&apos;ll confirm the exact item price and design on WhatsApp before payment.</p>
      <button className="custom-topper-form__submit" type="submit" disabled={!ready}>Add to cart <span aria-hidden="true">＋</span></button>
      {added && <p className="custom-topper-form__added" role="status">Added to cart. <Link href="/cart/">Choose delivery or pickup →</Link></p>}
    </form>
  );
}
