import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../worker/index.js", import.meta.url), "utf8");
const prefix = `const ASSETS = {}; const CATALOG = ${JSON.stringify([
  { id: "old", brand: "moments", name: "Old name", category: "Gifts", variants: [{ id: "old:v1", name: "Standard", priceSen: 1000, available: true }] },
  { id: "hidden", brand: "projects", name: "Hidden", category: "Logo", variants: [{ id: "hidden:v1", name: "Standard", priceSen: 2000, available: true }] },
])}; const TOPPER_PRICES = ${JSON.stringify({ cardstock: { 10: 1500, 13: 1600, 15: 1700, 18: 1800, 20: 2000 }, acrylic: { 10: 2500, 13: 2700, 15: 2900, 18: 3100, 20: 3500 }, wood: { 10: 2300, 13: 2400, 15: 2500, 18: 2600, 20: 2700 }, finishExtras: { "Mirror Rose Gold": 100, "Brown wood": 100 } })};\n`;
const module = await import(`data:text/javascript;base64,${Buffer.from(prefix + source + "\nexport { catalogSnapshot, topperPricingSnapshot, pricedLines };\n").toString("base64")}`);
const env = {
  SUPABASE_URL: "https://test.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_test", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  ACCOUNTS_ENABLED: "true", SUPABASE_EMAIL_READY: "true", UDESIGN_OWNER_USER_ID: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
};
const writes = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  if (url.pathname === "/auth/v1/user") return Response.json({ id: env.UDESIGN_OWNER_USER_ID, email: "owner@example.test", email_confirmed_at: "2026-01-01" });
  if (url.pathname.endsWith("/admin_members")) return Response.json([{ user_id: env.UDESIGN_OWNER_USER_ID }]);
  if (init.method === "POST") { writes.push({ path: url.pathname, rows: JSON.parse(init.body) }); return new Response(null, { status: 204 }); }
  if (url.pathname.endsWith("/catalog_products")) return Response.json([
    { id: "old", brand: "moments", event_slug: "Gifts", name: "Edited name", description: "Updated", image_path: null, active: true, sort_order: 0 },
    { id: "hidden", brand: "projects", event_slug: "Logo", name: "Hidden", description: null, image_path: null, active: false, sort_order: 0 },
    { id: "new", brand: "winnie", event_slug: "Cake toppers", name: "New topper", description: null, image_path: null, active: true, sort_order: 0 },
  ]);
  if (url.pathname.endsWith("/catalog_variants")) return Response.json([
    { id: "old:v1", product_id: "old", name: "Standard", price_sen: 2999, available: true, sort_order: 0 },
    { id: "new:v1", product_id: "new", name: "Small", price_sen: 2500, available: true, sort_order: 0 },
    { id: "custom-topper-prices:cardstock:10", product_id: "custom-topper-prices", name: "cardstock 10", price_sen: 1900, available: true, sort_order: 0 },
  ]);
  throw new Error(`Unexpected request: ${url}`);
};

const catalog = await module.catalogSnapshot(env);
assert.equal(catalog.find((item) => item.id === "old")?.variants[0].priceSen, 2999);
assert.equal(catalog.find((item) => item.id === "hidden"), undefined);
assert.equal(catalog.find((item) => item.id === "new")?.name, "New topper");
const topperPrices = await module.topperPricingSnapshot(env);
assert.equal(module.pricedLines([{ productId: "old", variantId: "old:v1", quantity: 1, notes: "" }], catalog, topperPrices)[0].price, 2999);
assert.throws(() => module.pricedLines([{ productId: "hidden", variantId: "hidden:v1", quantity: 1, notes: "" }], catalog, topperPrices));
assert.equal(topperPrices.cardstock[10], 1900);
assert.equal(topperPrices.cardstock[13], 1600);

const request = new Request("https://udesign.my/api/admin/catalog/", { method: "POST", headers: { origin: "https://udesign.my", authorization: "Bearer xxxxxxxxxxxxxxxxxxxx", "content-type": "application/json" }, body: JSON.stringify({ id: "new", brand: "winnie", category: "Cake toppers", name: "New topper", description: "Description", imageSrc: "", active: true, variants: [{ id: "new:v1", name: "Small", priceSen: 2600, available: true }] }) });
const response = await module.default.fetch(request, env, {});
assert.equal(response.status, 200);
assert.equal(writes.length, 3);
assert.equal(writes[1].rows[0].price_sen, 2600);

console.log("Catalog editor pricing and owner save checks passed.");
