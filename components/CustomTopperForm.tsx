"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import { formatRinggit } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";
import { topperChoicePriceSen, topperFinishes, topperFontStyles, topperProductName, topperSizes, topperWordCount, topperWordLimit, type TopperEventSlug, type TopperLineCount, type TopperMaterial } from "@/lib/topper";

export function CustomTopperForm({ initialEventSlug }: { initialEventSlug: TopperEventSlug }) {
  const { addItem, ready } = useCart();
  const [material, setMaterial] = useState<TopperMaterial | "">("");
  const [finish, setFinish] = useState("");
  const [sizeCm, setSizeCm] = useState(10);
  const [wording, setWording] = useState("");
  const [wordingError, setWordingError] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [fontSearch, setFontSearch] = useState("");
  const [shownFonts, setShownFonts] = useState(12);
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(false);
  const referenceInput = useRef<HTMLInputElement>(null);
  const wordingLines = wording.split(/\r?\n/);
  const lineCount = wordingLines.length as TopperLineCount;
  const wordingCharacters = wording.replace(/\r?\n/g, "").length;
  const wordCount = topperWordCount(wordingLines);
  const wordLimit = topperWordLimit(sizeCm);
  const unitPriceSen = material && finish ? topperChoicePriceSen(lineCount, material, finish, sizeCm) : undefined;
  const matchingFonts = useMemo(() => topperFontStyles.filter((font) => font.toLowerCase().includes(fontSearch.trim().toLowerCase())), [fontSearch]);
  const visibleFonts = matchingFonts.slice(0, shownFonts);

  useEffect(() => {
    if (!wording.trim()) return;
    for (const font of visibleFonts) {
      const id = `topper-font-${font.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}&display=swap`;
      document.head.appendChild(link);
    }
  }, [visibleFonts, wording]);

  function chooseMaterial(value: TopperMaterial) {
    setMaterial(value);
    setFinish("");
    setAdded(false);
  }

  function changeWording(value: string) {
    const next = value.replace(/\r\n?/g, "\n");
    if (next.replace(/\n/g, "").length > 40 || next.split("\n").length > 3) return;
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
    if (submitting || !ready || !material || !finish) return;
    if (wordingCharacters > 40 || wordingLines.some((line) => !line.trim())) {
      setWordingError("Please enter wording on every line, within 40 characters. Use up to 3 lines.");
      return;
    }
    if (wordLimit && wordCount > wordLimit) {
      setWordingError(`${sizeCm} cm allows up to ${wordLimit} words. Shorten your wording or choose a larger size.`);
      return;
    }
    if (sizeCm === 10 && lineCount > 2) {
      setWordingError("Three lines need a 13 cm or larger topper.");
      return;
    }
    if (unitPriceSen === undefined) return;
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
        product: topperProductName(),
        quantity,
        notes: "",
        ...(referenceImage ? { referenceImage } : {}),
        topper: {
          eventSlug: initialEventSlug,
          lineCount,
          material,
          finish,
          sizeCm,
          wording: wordingLines.map((line) => line.trim()),
          ...(fontFamily ? { fontFamily } : {}),
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
        <legend>1. Name / Phrase</legend>
        <p className="custom-topper-form__intro" id="topper-wording-help">Type the words exactly as you want them to appear. Press Enter for another line, up to 3 lines.</p>
        <p className="custom-topper-form__remaining" aria-live="polite">{40 - wordingCharacters} characters remaining</p>
        <p className="custom-topper-form__remaining" aria-live="polite">{wordCount} {wordCount === 1 ? "word" : "words"}{wordLimit ? ` · ${sizeCm} cm allows up to ${wordLimit} words` : ""}</p>
        <label className="custom-topper-form__field">Your wording
          <textarea rows={4} required value={wording} onChange={(event) => changeWording(event.target.value)} aria-describedby="topper-wording-help" placeholder={"e.g. Happy Birthday\nOlivia"} />
        </label>
        {wordLimit && wordCount > wordLimit && <p className="custom-topper-form__error" role="alert">{sizeCm} cm allows up to {wordLimit} words. Choose a larger size or shorten your wording.</p>}
        {sizeCm === 10 && lineCount > 2 && <p className="custom-topper-form__error" role="alert">Three lines need a 13 cm or larger topper.</p>}
        {wordingError && <p className="custom-topper-form__error" role="alert">{wordingError}</p>}
      </fieldset>

      <section className="custom-topper-form__fonts" aria-labelledby="topper-fonts-title">
        <h2 id="topper-fonts-title">Optional font style</h2>
        <p>Type your wording above to see it in 34 font styles chosen by UDESIGN. Choose one you like, or leave the style to us. You can also upload your own design photo below.</p>
        {fontFamily && <div className="custom-topper-form__selected-font"><span>Selected: <strong>{fontFamily}</strong></span><button type="button" onClick={() => { setFontFamily(""); setAdded(false); }}>Leave font choice to UDESIGN</button></div>}
        {wording.trim() ? <>
          <label className="custom-topper-form__field">Search the 34 fonts
            <input type="search" value={fontSearch} onChange={(event) => { setFontSearch(event.target.value); setShownFonts(12); }} placeholder="Search font names" />
          </label>
          <p className="custom-topper-form__font-count" role="status">Showing {visibleFonts.length} of {matchingFonts.length} fonts</p>
          <div className="custom-topper-form__font-grid">
            {visibleFonts.map((font) => <button type="button" key={font} className="custom-topper-form__font-card" aria-pressed={fontFamily === font} onClick={() => { setFontFamily(font); setAdded(false); }}>
              <span className="custom-topper-form__font-preview" style={{ fontFamily: `"${font}", cursive` }}>{wording}</span>
              <span className="custom-topper-form__font-name">{font}</span>
            </button>)}
          </div>
          {matchingFonts.length === 0 && <p>No font names match. Try another search.</p>}
          {shownFonts < matchingFonts.length && <button className="custom-topper-form__show-fonts" type="button" onClick={() => setShownFonts((current) => current + 12)}>Show more fonts</button>}
          <p className="custom-topper-form__font-note">This is a font preview. We&apos;ll send a design mock-up for you to confirm before making the topper.</p>
        </> : <p className="custom-topper-form__font-note">Font previews will appear when you type your wording.</p>}
      </section>

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
          {topperSizes.map((size) => <label className={sizeCm === size.cm ? "is-selected" : ""} key={size.cm}>
            <input type="radio" name="size" checked={sizeCm === size.cm} onChange={() => { setSizeCm(size.cm); setWordingError(""); setAdded(false); }} />
            <strong>{size.cm} cm</strong><small>{size.inch} inch</small>{topperWordLimit(size.cm) && <small>Max {topperWordLimit(size.cm)} words</small>}
          </label>)}
        </div>
        <p className="custom-topper-form__size-note">10 cm: 2 words and up to 2 lines. 13 cm: 5 words. 15 cm: 8 words. 18 cm: 10 words. 20 cm: 14 words. Up to 40 characters and 3 lines overall.</p>
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
      <div className="custom-topper-form__total"><span>{sizeCm} cm · {quantity} {quantity === 1 ? "piece" : "pieces"}</span><strong>{unitPriceSen === undefined ? lineCount === 3 && sizeCm === 10 ? "Choose 13 cm or larger" : "Choose your options" : formatRinggit(unitPriceSen * Math.max(1, quantity || 1))}</strong></div>
      <p className="custom-topper-form__hint">This is the item price. Delivery, if selected, is added in your cart. We&apos;ll confirm the design and ready date before payment.</p>
      <p className="custom-topper-form__hint">Need it urgently? <a href={whatsappLink("Hi UDESIGN, I need an urgent cake topper and can pick it up in Kuchai Lama, KL. Could you confirm if it is possible?")} target="_blank" rel="noopener noreferrer">Contact us on WhatsApp</a> first. Pickup in Kuchai Lama, KL is available once we confirm your order.</p>
      <button className="custom-topper-form__submit" type="submit" disabled={!ready || submitting}>{submitting ? referenceFile ? "Uploading image…" : "Adding to cart…" : "Add to cart"} <span aria-hidden="true">＋</span></button>
      {added && <p className="custom-topper-form__added" role="status">Added to cart{referenceFile ? " with your reference image" : ""}. <Link href="/cart/">Choose delivery or pickup →</Link></p>}
    </form>
  );
}
