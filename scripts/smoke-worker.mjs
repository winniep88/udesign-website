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
    return object ? { ...object, body: new Blob([object.bytes]).stream() } : null;
  },
  async list({ prefix, limit }) {
    return { objects: [...objects.keys()].filter((key) => key.startsWith(prefix)).sort().slice(0, limit).map((key) => ({ key })) };
  },
  async delete(key) { objects.delete(key); },
};
const env = { BUCKET: bucket };
const context = { waitUntil() {} };
const fetchSite = (path, options) => worker.fetch(new Request(`https://udesign.example${path}`, options), env, context);

for (const path of ["/", "/winnie-cake-topper/event/wedding/", "/winnie-cake-topper/event/wedding/3-line/", "/cart/"]) {
  const response = await fetchSite(path);
  assert.equal(response.status, 200, `${path} should load`);
  assert.match(await response.text(), /UDESIGN|Cake Topper|Your cart/i);
}
assert.equal((await fetchSite("/missing-page/")).status, 404);
const oldProduct = await fetchSite("/winnie-cake-topper/topper/3-line/?event=wedding");
assert.equal(oldProduct.status, 308);
assert.equal(oldProduct.headers.get("location"), "https://udesign.example/winnie-cake-topper/event/wedding/3-line/");

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
console.log("Worker storefront and reference image upload smoke checks passed.");
