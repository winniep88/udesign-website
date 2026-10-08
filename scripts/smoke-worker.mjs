import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const worker = (await import(pathToFileURL(resolve("dist/server/index.js")).href)).default;
const objects = new Map();
const bucket = {
  async put(key, body, options = {}) {
    objects.set(key, {
      bytes: typeof body === "string" ? new TextEncoder().encode(body) : new Uint8Array(body),
      httpMetadata: options.httpMetadata,
      customMetadata: options.customMetadata,
    });
  },
  async get(key) {
    const object = objects.get(key);
    return object ? { ...object, body: new Blob([object.bytes]).stream(), json: async () => JSON.parse(new TextDecoder().decode(object.bytes)) } : null;
  },
  async list({ prefix, limit }) {
    return { objects: [...objects.keys()].filter((key) => key.startsWith(prefix)).sort().slice(0, limit).map((key) => ({ key })) };
  },
  async delete(key) { objects.delete(key); },
};
const env = { BUCKET: bucket };
const context = { waitUntil() {} };
const fetchSite = (path, options) => worker.fetch(new Request(`https://udesign.example${path}`, options), env, context);

for (const path of ["/", "/winnie-cake-topper/event/wedding/", "/winnie-cake-topper/event/wedding/custom-cake-topper/", "/cart/"]) {
  const response = await fetchSite(path);
  assert.equal(response.status, 200, `${path} should load`);
  assert.match(await response.text(), /UDESIGN|Cake Topper|Your cart/i);
}
assert.equal((await fetchSite("/missing-page/")).status, 404);
const oldProduct = await fetchSite("/winnie-cake-topper/topper/3-line/?event=wedding");
assert.equal(oldProduct.status, 308);
assert.equal(oldProduct.headers.get("location"), "https://udesign.example/winnie-cake-topper/event/wedding/custom-cake-topper/");
const oldEventProduct = await fetchSite("/winnie-cake-topper/event/wedding/2-line/");
assert.equal(oldEventProduct.status, 308);
assert.equal(oldEventProduct.headers.get("location"), "https://udesign.example/winnie-cake-topper/event/wedding/custom-cake-topper/");

const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/uQAAAABJRU5ErkJggg==", "base64"));
const upload = (headers) => fetchSite("/api/reference/", { method: "POST", headers: { "content-type": "image/png", ...headers }, body: png });
assert.equal((await upload({})).status, 403, "Cross-origin upload must be blocked");
const response = await upload({ origin: "https://udesign.example", "cf-connecting-ip": "127.0.0.1" });
assert.equal(response.status, 201);
const { id, url } = await response.json();
assert.match(id, /^\d{4}-\d{2}-\d{2}-[0-9a-f-]{36}$/);
assert.equal(url, `/api/reference/${id}/`);
const reference = await fetchSite(url);
assert.equal(reference.status, 200);
assert.equal(reference.headers.get("content-type"), "image/png");
assert.deepEqual(new Uint8Array(await reference.arrayBuffer()), png);
assert.equal((await fetchSite("/api/reference/not-an-id/")).status, 404);
assert.deepEqual(await (await fetchSite("/api/checkout/status/")).json(), { available: false });
const checkoutBody = { items: [{ productId: "4306939371", variantId: "4306939371:307123826891", quantity: 2, notes: "Happy birthday" }], fulfilment: "pickup", customer: { name: "Test Customer", email: "test@example.com", phone: "+60123456789" } };
const checkout = (body) => fetchSite("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(body) });
assert.equal((await checkout(checkoutBody)).status, 503, "Payment remains closed until credentials are installed");
const paidEnv = { ...env, CHIP_SECRET_KEY: "test-secret", CHIP_BRAND_ID: "brand-123" };
const originalFetch = globalThis.fetch;
let createdPurchase;
let purchaseTotal;
globalThis.fetch = async (url, options) => {
  assert.match(url, /^https:\/\/gate\.chip-in\.asia\/api\/v1\/purchases\//);
  if (options.method === "POST") {
    createdPurchase = JSON.parse(options.body);
    purchaseTotal = createdPurchase.purchase.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Response.json({ id: "purchase-123", brand_id: "brand-123", is_test: false, reference: createdPurchase.reference, purchase: { total: purchaseTotal }, checkout_url: "https://gate.chip-in.asia/p/purchase-123/" });
  }
  return Response.json({ id: "purchase-123", brand_id: "brand-123", is_test: false, reference: createdPurchase.reference, purchase: { total: purchaseTotal }, status: "paid" });
};
try {
  const paidFetch = (path, options) => worker.fetch(new Request(`https://udesign.example${path}`, options), paidEnv, context);
  const body = { ...checkoutBody, items: checkoutBody.items.map((item) => ({ ...item, priceSen: 1 })) };
  const start = await paidFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(start.status, 200);
  const { orderId } = await start.json();
  assert.equal(createdPurchase.purchase.products[0].price, 1600, "Server must use catalog price, not browser price");
  const status = await paidFetch(`/api/orders/${orderId}/status/`);
  assert.deepEqual(await status.json(), { status: "paid", orderId });
  const topper = { brand: "winnie", product: "Custom Cake Topper", quantity: 1, notes: "", topper: { eventSlug: "birthday", lineCount: 1, material: "cardstock", finish: "Glitter Black", sizeCm: 10, wording: ["Happy Birthday Olivia"] } };
  const topperCheckout = (item) => paidFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify({ ...checkoutBody, items: [item] }) });
  assert.equal((await topperCheckout(topper)).status, 400, "10 cm must reject more than two words");
  assert.equal((await topperCheckout({ ...topper, topper: { ...topper.topper, sizeCm: 13, wording: ["One Two Three Four Five Six"] } })).status, 400, "13 cm must reject more than five words");
  for (const [sizeCm, limit] of [[15, 8], [18, 10], [20, 14]]) {
    const wording = [Array.from({ length: limit + 1 }, () => "a").join(" ")];
    assert.equal((await topperCheckout({ ...topper, topper: { ...topper.topper, sizeCm, wording } })).status, 400, `${sizeCm} cm must reject more than ${limit} words`);
  }
  const validTopper = await topperCheckout({ ...topper, topper: { ...topper.topper, wording: ["Happy Birthday"] } });
  assert.equal(validTopper.status, 200, "10 cm accepts two words");
  assert.equal(createdPurchase.purchase.products[0].price, 1500);
} finally { globalThis.fetch = originalFetch; }
console.log("Worker storefront, image upload and CHIP checkout checks passed.");
