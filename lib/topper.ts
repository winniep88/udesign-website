import topperFonts from "@/data/topper-fonts.json";

export const topperFontStyles: readonly string[] = topperFonts;

export const topperEvents = [
  { slug: "birthday", name: "Birthday", description: "A cake topper made for their day." },
  { slug: "wedding", name: "Wedding", description: "Names and words for your wedding cake." },
  { slug: "baby-shower", name: "Baby Shower", description: "A sweet detail for a new arrival." },
  { slug: "bridal-shower", name: "Bridal Shower", description: "A personal touch for the bride-to-be." },
  { slug: "anniversary", name: "Anniversary", description: "Celebrate the years and the story." },
  { slug: "celebration", name: "Celebration", description: "Something special for any occasion." },
] as const;

export type TopperEvent = (typeof topperEvents)[number];
export type TopperEventSlug = TopperEvent["slug"];
export type TopperLineCount = 1 | 2 | 3;
export type TopperMaterial = "cardstock" | "acrylic" | "wood";

export const topperLineCounts: TopperLineCount[] = [1, 2, 3];

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
    { name: "Glitter Black", extraRm: 0 },
    { name: "Glitter Dark Blue", extraRm: 0 },
    { name: "Glitter Green", extraRm: 0 },
    { name: "Glitter Gold", extraRm: 0 },
    { name: "Glitter Pink", extraRm: 0 },
    { name: "Glitter Purple", extraRm: 0 },
    { name: "Glitter Silver", extraRm: 0 },
    { name: "Matte Black", extraRm: 0 },
    { name: "Shiny Gold", extraRm: 0 },
    { name: "Shiny Rose Gold", extraRm: 0 },
    { name: "Shiny Silver", extraRm: 0 },
  ],
  acrylic: [
    { name: "Black", extraRm: 0 },
    { name: "Blue", extraRm: 0 },
    { name: "Green", extraRm: 0 },
    { name: "Grey", extraRm: 0 },
    { name: "Matte gold", extraRm: 0 },
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

// Add curated event designs here later. The custom product remains shared.
export type TopperEventDesign = {
  id: string;
  name: string;
  description: string;
  imageSrc: string;
  lineCount: TopperLineCount;
};
export const topperEventDesigns: Record<TopperEventSlug, readonly TopperEventDesign[]> = {
  birthday: [],
  wedding: [],
  "baby-shower": [],
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

export function topperChoicePriceSen(lineCount: TopperLineCount, material: TopperMaterial, finish: string, sizeCm: number): number | undefined {
  if (!topperLineCounts.includes(lineCount) || !topperSizes.some((size) => size.cm === sizeCm) || (lineCount === 3 && sizeCm < 13)) return undefined;
  const baseRm = topperBasePricesRm[material]?.[sizeCm];
  const extraRm = topperFinishes[material]?.find((choice) => choice.name === finish)?.extraRm;
  if (baseRm === undefined || extraRm === undefined) return undefined;
  return (baseRm + extraRm) * 100;
}

export function normaliseTopperSelection(value: unknown): TopperCartSelection | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Partial<TopperCartSelection>;
  if (typeof item.eventSlug !== "string" || !topperEvent(item.eventSlug)) return undefined;
  if (item.lineCount !== 1 && item.lineCount !== 2 && item.lineCount !== 3) return undefined;
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
    finish: item.finish,
    sizeCm: item.sizeCm,
    wording: item.wording.map((line) => line.replace(/\s+/g, " ").trim()),
    ...(item.fontFamily ? { fontFamily: item.fontFamily } : {}),
    ...(item.details?.trim() ? { details: item.details.trim() } : {}),
  };
}

export function topperSelectionPriceSen(selection: TopperCartSelection): number | undefined {
  return topperChoicePriceSen(selection.lineCount, selection.material, selection.finish, selection.sizeCm);
}

