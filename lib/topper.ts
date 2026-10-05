export const topperEvents = [
  { slug: "birthday", name: "Birthday", description: "A cake topper made for their day." },
  { slug: "wedding", name: "Wedding", description: "Names and words for your wedding cake." },
  { slug: "baby-shower", name: "Baby Shower", description: "A sweet detail for a new arrival." },
  { slug: "bridal-shower", name: "Bridal Shower", description: "A personal touch for the bride-to-be." },
  { slug: "anniversary", name: "Anniversary", description: "Celebrate the years and the story." },
  { slug: "celebration", name: "Celebration", description: "Something special for any occasion." },
] as const;

export type TopperEvent = (typeof topperEvents)[number];
export type TopperLineCount = 1 | 2 | 3;

export const topperLineCounts: TopperLineCount[] = [1, 2, 3];

export const topperSizes = [
  { cm: 10, inch: 4 },
  { cm: 13, inch: 5 },
  { cm: 15, inch: 6 },
  { cm: 18, inch: 7 },
  { cm: 20, inch: 8 },
] as const;

export function topperEvent(slug: string) {
  return topperEvents.find((event) => event.slug === slug);
}

export function topperEventHref(slug: string) {
  return `/winnie-cake-topper/event/${slug}/`;
}

export function topperProductHref(slug: string, lines: TopperLineCount) {
  return `/winnie-cake-topper/event/${slug}/${lines}-line/`;
}

export function topperLineLabel(lines: TopperLineCount) {
  return `${lines} ${lines === 1 ? "line" : "lines"}`;
}
