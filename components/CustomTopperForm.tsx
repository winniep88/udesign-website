"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import { formatRinggit } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";
import { topperChoicePriceSen, topperFinishes, topperLineLabel, topperProductName, topperSizes, type TopperEventSlug, type TopperLineCount, type TopperMaterial } from "@/lib/topper";

export function CustomTopperForm({ lineCount, initialEventSlug }: { lineCount: TopperLineCount; initialEventSlug: TopperEventSlug }) {
  const { addItem, ready } = useCart();
  const [material, setMaterial] = useState<TopperMaterial | "">("");
  const [finish, setFinish] = useState("");
  const [sizeCm, setSizeCm] = useState(lineCount === 3 ? 13 : 10);
  const [wording, setWording] = useState(["", "", ""]);
  const [wordingError, setWordingError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(false);
  const referenceInput = useRef<HTMLInputElement>(null);
  const availableSizes = topperSizes.filter((size) => lineCount !== 3 || size.cm >= 13);
  const wordingCharacters = wording.slice(0, lineCount).join("").length;
  const unitPriceSen = material && finish ? topperChoicePriceSen(lineCount, material, finish, sizeCm) : undefined;

  function chooseMaterial(value: TopperMaterial) {
    setMaterial(value);
    setFinish("");
    setAdded(false);
  }

  function changeLine(index: number, value: string) {
    const next = wording.map((line, lineIndex) => lineIndex === index ? value : line);
    if (next.slice(0, lineCount).join("").length > 40) return;
    setWording(next);
    setWordingError("");
    setAdded(false);
  }

  function chooseReference(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAdded(false);
    setUploadError("");
    if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setReferenceFile(null);
      setUploadError("Choose a JPG, PNG or WebP image under 5 MB.");
      event.target.value = "";
      return;
    }
    setReferenceFile(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !ready || !material || !finish || unitPriceSen === undefined) return;
    if (wordingCharacters > 40 || wording.slice(0, lineCount).some((line) => !line.trim())) {
      setWordingError(`Please enter wording for all ${lineCount} ${lineCount === 1 ? "line" : "lines"}, within 40 characters.`);
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
    setSubmitting(true);
    setUploadError("");
    try {
      let referenceImage: { id: string; url: string; name: string } | undefined;
      if (referenceFile) {
        const response = await fetch("/api/reference/", {
          method: "POST",
          headers: { "content-type": referenceFile.type },
          body: referenceFile,
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({})) as { id?: unknown; url?: unknown; error?: unknown };
        if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Your image could not be uploaded. Please try again.");
        if (typeof result.id !== "string" || typeof result.url !== "string" || result.url !== `/api/reference/${result.id}/`) throw new Error("The image upload did not finish. Please try again.");
        referenceImage = { id: result.id, url: result.url, name: referenceFile.name.slice(0, 150) };
      }
      addItem({
        brand: "winnie",
        product: topperProductName(lineCount),
        quantity,
        notes: "",
        ...(referenceImage ? { referenceImage } : {}),
        topper: {
          eventSlug: initialEventSlug,
          lineCount,
          material,
          finish,
          sizeCm,
          wording: wording.slice(0, lineCount).map((line) => line.trim()),
          ...(details.trim() ? { details: details.trim() } : {}),
        },
      });
      setAdded(true);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Your image could not be uploaded. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="custom-topper-form" id="customise" onSubmit={submit}>
      <fieldset className="custom-topper-form__wording">
        <legend>1. Name / Phrase ({lineCount} {lineCount === 1 ? "Line" : "Lines"})</legend>
        <p className="custom-topper-form__intro">Type the words exactly as you want them to appear, one line in each box.</p>
        <p className="custom-topper-form__remaining" aria-live="polite">{40 - wordingCharacters} characters remaining</p>
        {Array.from({ length: lineCount }, (_, index) => <label className="custom-topper-form__field" key={index}>Line {index + 1}
          <input type="text" maxLength={40} required value={wording[index]} onChange={(event) => changeLine(index, event.target.value)} placeholder={index === 0 ? "e.g. Happy Birthday" : index === 1 ? "e.g. Olivia" : "e.g. Three"} />
        </label>)}
        {wordingError && <p className="custom-topper-form__error" role="alert">{wordingError}</p>}
      </fieldset>

      <label className="custom-topper-form__field">2. Material Type
        <select required value={material} onChange={(event) => chooseMaterial(event.target.value as TopperMaterial)}>
          <option value="" disabled>Please select Cardstock, Acrylic or Wood</option>
          <option value="cardstock">Cardstock</option>
          <option value="acrylic">Acrylic</option>
          <option value="wood">Wood</option>
        </select>
      </label>

      <label className="custom-topper-form__field">3. {material === "wood" ? "Wood finish" : "Colour or finish"}
        <select required value={finish} disabled={!material} onChange={(event) => { setFinish(event.target.value); setAdded(false); }}>
          <option value="" disabled>{material ? "Choose a colour or finish" : "Choose a material first"}</option>
          {material && topperFinishes[material].map((option) => <option key={option.name} value={option.name}>{option.name}{option.extraRm ? ` (+RM${option.extraRm})` : ""}</option>)}
        </select>
      </label>
      <p className="custom-topper-form__hint">The finishes change with your material. Your price updates when you change a choice.</p>

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

      <label className="custom-topper-form__field">Quantity
        <input type="number" min={1} max={99} required value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setAdded(false); }} />
      </label>
      <label className="custom-topper-form__field">Special Request <span>Optional · {50 - details.length} characters remaining</span>
        <textarea rows={3} maxLength={50} value={details} onChange={(event) => { setDetails(event.target.value); setAdded(false); }} placeholder="Theme, font style or other requests" />
      </label>
      <label className="custom-topper-form__field">Reference Photo, If Any <span>Optional · JPG, PNG or WebP · max 5 MB</span>
        <input ref={referenceInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseReference} />
      </label>
      {referenceFile && <button className="custom-topper-form__remove-image" type="button" onClick={() => { setReferenceFile(null); setUploadError(""); setAdded(false); if (referenceInput.current) referenceInput.current.value = ""; }}>Remove selected image</button>}
      <p className="custom-topper-form__hint">Upload a design you like and we can make something similar. The image link is included with your WhatsApp request and remains available for 30 days. Anyone with the link can view it.</p>
      {uploadError && <p className="custom-topper-form__error" role="alert">{uploadError} You can remove the image and send it to us in WhatsApp instead.</p>}
      <div className="custom-topper-form__total"><span>{topperLineLabel(lineCount)} · {quantity} {quantity === 1 ? "piece" : "pieces"}</span><strong>{unitPriceSen === undefined ? "Choose your options" : formatRinggit(unitPriceSen * Math.max(1, quantity || 1))}</strong></div>
      <p className="custom-topper-form__hint">This is the item price. Delivery, if selected, is added in your cart. We&apos;ll confirm the design and ready date before payment.</p>
      <p className="custom-topper-form__hint">Need it urgently? <a href={whatsappLink("Hi UDESIGN, I need an urgent cake topper and can pick it up in Kuchai Lama, KL. Could you confirm if it is possible?")} target="_blank" rel="noopener noreferrer">Contact us on WhatsApp</a> first. Pickup in Kuchai Lama, KL is available once we confirm your order.</p>
      <button className="custom-topper-form__submit" type="submit" disabled={!ready || submitting}>{submitting ? referenceFile ? "Uploading image…" : "Adding to cart…" : "Add to cart"} <span aria-hidden="true">＋</span></button>
      {added && <p className="custom-topper-form__added" role="status">Added to cart{referenceFile ? " with your reference image" : ""}. <Link href="/cart/">Choose delivery or pickup →</Link></p>}
    </form>
  );
}
