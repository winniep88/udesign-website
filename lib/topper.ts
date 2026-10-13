import topperFonts from "@/data/topper-fonts.json";

export const topperFontStyles: readonly string[] = topperFonts;

export const topperEvents = [
  { slug: "birthday", name: "Birthday", description: "A cake topper made for their day.", imageSrc: "/images/topper-events/birthday.jpeg" },
  { slug: "wedding", name: "Wedding", description: "Names and words for your wedding cake.", imageSrc: "/images/topper-events/wedding.jpeg" },
  { slug: "baby-shower", name: "Baby Shower", description: "A sweet detail for a new arrival.", imageSrc: "/images/topper-events/baby-shower.jpeg" },
  { slug: "bridal-shower", name: "Bridal Shower", description: "A personal touch for the bride-to-be.", imageSrc: "/images/topper-events/bridal-shower.jpeg" },
  { slug: "anniversary", name: "Anniversary", description: "Celebrate the years and the story.", imageSrc: "/images/topper-events/anniversary.jpeg" },
  { slug: "celebration", name: "Celebration", description: "Something special for any occasion.", imageSrc: "/images/topper-events/celebration.jpeg" },
] as const;

export type TopperEvent = (typeof topperEvents)[number];
export type TopperEventSlug = TopperEvent["slug"];
export type TopperLineCount = 1 | 2 | 3 | 4 | 5;
export type TopperMaterial = "cardstock" | "acrylic" | "wood";

export const topperLineCounts: TopperLineCount[] = [1, 2, 3, 4, 5];

export const topperSizes = [
  { cm: 10, inch: 4 },
  { cm: 13, inch: 5 },
  { cm: 15, inch: 6 },
  { cm: 18, inch: 7 },
  { cm: 20, inch: 8 },
] as const;

// Confirmed by UDESIGN in its completed price sheet on 6 October 2026.
// One custom product uses these material and size prices across all events.
export const topperBasePricesRm: Record<TopperMaterial, Record<number, number>> = {
  cardstock: { 10: 15, 13: 16, 15: 17, 18: 18, 20: 20 },
  acrylic: { 10: 25, 13: 27, 15: 29, 18: 31, 20: 35 },
  wood: { 10: 23, 13: 24, 15: 25, 18: 26, 20: 27 },
};

export const topperFinishes: Record<TopperMaterial, readonly { name: string; extraRm: number }[]> = {
  cardstock: [
    { name: "Glitter Silver", extraRm: 0 },
    { name: "Glitter Gold", extraRm: 0 },
    { name: "Glitter Black", extraRm: 0 },
    { name: "Glitter Pink", extraRm: 0 },
    { name: "Glitter Light Pink", extraRm: 0 },
    { name: "Glitter Red", extraRm: 0 },
    { name: "Glitter Green", extraRm: 0 },
    { name: "Glitter Dark Blue", extraRm: 0 },
    { name: "Glitter Dark Purple", extraRm: 0 },
    { name: "Matte Black", extraRm: 0 },
    { name: "Shiny Silver", extraRm: 0 },
    { name: "Shiny Gold", extraRm: 0 },
    { name: "Shiny Rose Gold", extraRm: 0 },
  ],
  acrylic: [
    { name: "Black", extraRm: 0 },
    { name: "Blue", extraRm: 0 },
    { name: "Green", extraRm: 0 },
    { name: "Grey", extraRm: 0 },
    { name: "Matte gold", extraRm: 0 },
    { name: "Mirror Copper", extraRm: 0 },
    { name: "Mirror Gold", extraRm: 0 },
    { name: "Mirror Rose Gold", extraRm: 1 },
    { name: "Mirror Silver", extraRm: 0 },
    { name: "Pink", extraRm: 0 },
    { name: "Red", extraRm: 0 },
    { name: "Yellow", extraRm: 0 },
  ],
  wood: [
    { name: "Natural wood", extraRm: 0 },
    { name: "Brown wood", extraRm: 1 },
  ],
};

export type TopperEventDesign = {
  id: string;
  name: string;
  imageSrc: string;
};
export const topperEventDesigns: Record<TopperEventSlug, readonly TopperEventDesign[]> = {
  birthday: [
    { id: "F001", name: "First birthday name", imageSrc: "/images/topper-designs/f001.jpeg" },
    { id: "F002", name: "First birthday animals", imageSrc: "/images/topper-designs/f002.jpeg" },
    { id: "F003", name: "First birthday numeral", imageSrc: "/images/topper-designs/f003.jpeg" },
    { id: "A001-C001", name: "Milestone number", imageSrc: "/images/topper-designs/a001-c001.jpeg" },
    { id: "B001", name: "Milestone celebration", imageSrc: "/images/topper-designs/b001.jpeg" },
    { id: "B001-F004", name: "Floral birthday", imageSrc: "/images/topper-designs/b001-f004.jpeg" },
    { id: "B002", name: "Ballerina birthday", imageSrc: "/images/topper-designs/b002.jpeg" },
  ],
  wedding: [
    { id: "W001", name: "Mr & Mrs script", imageSrc: "/images/topper-designs/w001.jpeg" },
    { id: "W002", name: "Floral initials", imageSrc: "/images/topper-designs/w002.jpeg" },
    { id: "W003", name: "Couple names", imageSrc: "/images/topper-designs/w003.jpeg" },
    { id: "W004", name: "Golden initials", imageSrc: "/images/topper-designs/w004.png" },
    { id: "W005", name: "Floral names", imageSrc: "/images/topper-designs/w005.jpeg" },
    { id: "W006", name: "Floral names, full setting", imageSrc: "/images/topper-designs/w006.jpeg" },
    { id: "W007", name: "Names in a circle", imageSrc: "/images/topper-designs/w007.jpeg" },
    { id: "W008", name: "Names with leaves", imageSrc: "/images/topper-designs/w008.jpeg" },
    { id: "W009", name: "Names in a frame", imageSrc: "/images/topper-designs/w009.jpeg" },
    { id: "W010", name: "Script names", imageSrc: "/images/topper-designs/w010-natural-wood.jpeg" },
    { id: "W011", name: "Floral wreath", imageSrc: "/images/topper-designs/w011-natural-wood.jpeg" },
  ],
  "baby-shower": [
    { id: "S001", name: "Mum and baby outline", imageSrc: "/images/topper-designs/s001.jpeg" },
    { id: "S002", name: "Baby name", imageSrc: "/images/topper-designs/s002.jpeg" },
    { id: "S003", name: "Welcome baby", imageSrc: "/images/topper-designs/s003.jpeg" },
  ],
  "bridal-shower": [],
  anniversary: [],
  celebration: [],
};

export type TopperCartSelection = {
  eventSlug: TopperEventSlug;
  lineCount: TopperLineCount;
  material: TopperMaterial;
  finish: string;
  sizeCm: number;
  wording: string[];
  fontFamily?: string;
  details?: string;
};

export function topperEvent(slug: string) {
  return topperEvents.find((event) => event.slug === slug);
}

export function topperEventHref(slug: string) {
  return `/winnie-cake-topper/event/${slug}/`;
}

export function topperProductHref(slug: string) {
  return `/winnie-cake-topper/event/${encodeURIComponent(slug)}/custom-cake-topper/`;
}

export function topperLineLabel(lines: TopperLineCount) {
  return `${lines} ${lines === 1 ? "line" : "lines"}`;
}

export function topperProductName() {
  return "Custom Cake Topper";
}

export function topperCharacterLimit(sizeCm: number): number | undefined {
  return ({ 10: 30, 13: 40, 15: 50, 18: 60, 20: 80 } as Record<number, number>)[sizeCm];
}

export function topperWordLimit(sizeCm: number): number | undefined {
  return ({ 10: 2, 13: 5, 15: 8, 18: 10, 20: 14 } as Record<number, number>)[sizeCm];
}

export function topperWordCount(wording: readonly string[]): number {
  return wording.join(" ").trim().split(/\s+/u).filter(Boolean).length;
}

export type TopperPricing = Record<TopperMaterial, Record<number, number>> & { finishExtras: Record<string, number> };

export function topperChoicePriceSen(lineCount: TopperLineCount, material: TopperMaterial, finish: string, sizeCm: number, prices?: TopperPricing): number | undefined {
  if (!topperLineCounts.includes(lineCount) || !topperSizes.some((size) => size.cm === sizeCm)) return undefined;
  const baseRm = topperBasePricesRm[material]?.[sizeCm];
  const baseSen = prices?.[material]?.[sizeCm] ?? (baseRm === undefined ? undefined : baseRm * 100);
  const currentFinish = material === "cardstock" && finish === "Glitter Purple" ? "Glitter Dark Purple" : finish;
  const extraRm = topperFinishes[material]?.find((choice) => choice.name === currentFinish)?.extraRm;
  if (baseSen === undefined || extraRm === undefined) return undefined;
  return baseSen + (prices?.finishExtras?.[currentFinish] ?? extraRm * 100);
}

export function normaliseTopperSelection(value: unknown): TopperCartSelection | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Partial<TopperCartSelection>;
  if (typeof item.eventSlug !== "string" || !topperEvent(item.eventSlug)) return undefined;
  if (item.lineCount === undefined || !topperLineCounts.includes(item.lineCount)) return undefined;
  if (item.material !== "cardstock" && item.material !== "acrylic" && item.material !== "wood") return undefined;
  if (typeof item.finish !== "string" || typeof item.sizeCm !== "number" || topperChoicePriceSen(item.lineCount, item.material, item.finish, item.sizeCm) === undefined) return undefined;
  if (!Array.isArray(item.wording) || item.wording.length !== item.lineCount) return undefined;
  if (item.wording.some((line) => typeof line !== "string" || !line.trim() || line.length > 80)) return undefined;
  if (item.details !== undefined && (typeof item.details !== "string" || item.details.length > 120)) return undefined;
  // Keep older cart selections when the public font list is curated again.
  if (item.fontFamily !== undefined && (typeof item.fontFamily !== "string" || item.fontFamily.length > 80 || !/^[\p{L}\p{N} .'-]+$/u.test(item.fontFamily))) return undefined;
  return {
    eventSlug: item.eventSlug as TopperEventSlug,
    lineCount: item.lineCount,
    material: item.material,
    finish: item.material === "cardstock" && item.finish === "Glitter Purple" ? "Glitter Dark Purple" : item.finish,
    sizeCm: item.sizeCm,
    wording: item.wording.map((line) => line.replace(/\s+/g, " ").trim()),
    ...(item.fontFamily ? { fontFamily: item.fontFamily } : {}),
    ...(item.details?.trim() ? { details: item.details.trim() } : {}),
  };
}

export function topperSelectionPriceSen(selection: TopperCartSelection, prices?: TopperPricing): number | undefined {
  return topperChoicePriceSen(selection.lineCount, selection.material, selection.finish, selection.sizeCm, prices);
}

