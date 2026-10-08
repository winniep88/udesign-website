// ASSETS is generated from the Next static export by scripts/build-worker.mjs.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PER_IP_PER_DAY = 5;
const MAX_TOTAL_PER_DAY = 50;
const MAX_AGE_MS = 30 * 86_400_000;
const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27,28}$/;
const SHIPPING = { west: 800, east: 1500, singapore: 2000 };
const CHIP_API = "https://gate.chip-in.asia/api/v1/purchases/";

function errorJson(message, status) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

function cleanString(value, limit) {
  return typeof value === "string" && value.trim() && value.trim().length <= limit ? value.trim() : null;
}

function pricedLines(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new Error("Choose 1–20 priced items.");
  return items.map((item) => {
    if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error("Check the item quantity.");
    if (typeof item.notes !== "string" || item.notes.length > 1000) throw new Error("Check the personalisation notes.");
    let name, price, brand;
    if (item.topper && !item.productId && !item.variantId) {
      const t = item.topper;
      const validEvent = ["birthday", "wedding", "baby-shower", "bridal-shower", "anniversary", "celebration"].includes(t.eventSlug);
      const validLines = [1, 2, 3].includes(t.lineCount) && Array.isArray(t.wording) && t.wording.length === t.lineCount && t.wording.every((s) => cleanString(s, 60));
      const validSize = [10, 13, 15, 18, 20].includes(t.sizeCm) && (t.lineCount !== 3 || t.sizeCm >= 13);
      const finishes = { cardstock: ["Glitter Black", "Glitter Dark Blue", "Glitter Green", "Glitter Gold", "Glitter Pink", "Glitter Purple", "Glitter Silver", "Matte Black", "Shiny Gold", "Shiny Rose Gold", "Shiny Silver"], acrylic: ["Black", "Blue", "Green", "Grey", "Matte gold", "Mirror Gold", "Mirror Rose Gold", "Mirror Silver", "Pink", "Red", "Yellow"], wood: ["Natural wood", "Brown wood"] };
      if (!validEvent || !validLines || !validSize || !finishes[t.material]?.includes(t.finish) || (t.details && !cleanString(t.details, 120)) || (t.fontFamily && !TOPPER_FONTS.includes(t.fontFamily))) throw new Error("Check the cake topper choices.");
      price = TOPPER_PRICES[t.material]?.[t.sizeCm] + (TOPPER_PRICES.finishExtras[t.finish] ?? 0);
      name = `Custom ${t.lineCount} line cake topper · ${t.material}, ${t.finish}, ${t.sizeCm}cm${t.fontFamily ? ` · ${t.fontFamily}` : ""}`;
      brand = "winnie";
    } else {
      const product = CATALOG.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      if (!variant?.available || !Number.isInteger(variant.priceSen) || variant.priceSen <= 0) throw new Error("An item needs a price confirmation on WhatsApp.");
      name = `${product.name} · ${variant.name}`.slice(0, 200);
      price = variant.priceSen;
      brand = product.brand;
    }
    if (!Number.isInteger(price) || price <= 0) throw new Error("An item needs a price confirmation on WhatsApp.");
    const reference = item.referenceImage;
    if (reference && (!ID_PATTERN.test(reference.id) || reference.url !== `/api/reference/${reference.id}/`)) throw new Error("Check the reference image.");
    return { name, price, quantity: item.quantity, brand, notes: item.notes.trim(), reference: reference?.url, topper: item.topper };
  });
}

async function chipRequest(env, path, options = {}) {
  const response = await fetch(`${CHIP_API}${path}`, { ...options, headers: { authorization: `Bearer ${env.CHIP_SECRET_KEY}`, "content-type": "application/json" } });
  if (!response.ok) throw new Error(`CHIP API ${response.status}`);
  return response.json();
}

async function createCheckout(request, env) {
  if (!env.CHIP_SECRET_KEY || !env.CHIP_BRAND_ID || !env.BUCKET) return errorJson("Online payment is awaiting CHIP approval. Please continue on WhatsApp for now.", 503);
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) return errorJson("Please check out from the UDESIGN website.", 403);
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 40_000) return errorJson("The cart is too large.", 413);
  let input;
  try { const body = await request.text(); if (body.length > 40_000) return errorJson("The cart is too large.", 413); input = JSON.parse(body); } catch { return errorJson("Please check your order details.", 400); }
  let lines;
  try { lines = pricedLines(input.items); } catch (error) { return errorJson(error.message, 400); }
  const customer = input.customer;
  const name = cleanString(customer?.name, 100);
  const email = cleanString(customer?.email, 150);
  const phone = cleanString(customer?.phone, 30);
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !/^\+?[\d\s()-]{8,30}$/.test(phone)) return errorJson("Enter your name, email and phone number.", 400);
  const fulfilment = input.fulfilment;
  if (fulfilment !== "pickup" && fulfilment !== "delivery") return errorJson("Choose pickup or delivery.", 400);
  let shipping = 0;
  let address = null;
  if (fulfilment === "delivery") {
    if (!lines.every((line) => line.brand === "winnie")) return errorJson("Delivery for this cart needs a quote on WhatsApp.", 400);
    shipping = SHIPPING[input.region];
    address = cleanString(input.address, 500);
    if (!shipping || !address || address.length < 10) return errorJson("Choose a delivery region and enter your full address.", 400);
  }
  const notes = typeof input.extraNotes === "string" ? input.extraNotes.trim().slice(0, 500) : "";
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, shipping);
  if (total <= 0 || total > 1_000_000) return errorJson("Please contact us for this order.", 400);
  const orderId = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const products = lines.map((line) => ({ name: line.name, price: line.price, quantity: line.quantity }));
  if (shipping) products.push({ name: `Delivery · ${input.region}`, price: shipping, quantity: 1 });
  const order = { id: orderId, createdAt: Date.now(), customer: { name, email, phone }, fulfilment, region: input.region ?? null, address, notes, lines, shipping, total, status: "creating" };
  await env.BUCKET.put(`orders/${orderId}`, JSON.stringify(order));
  let purchase;
  try {
    purchase = await chipRequest(env, "", { method: "POST", body: JSON.stringify({ brand_id: env.CHIP_BRAND_ID, client: { email, full_name: name, phone }, purchase: { currency: "MYR", products, notes: `UDESIGN order ${orderId}. ${fulfilment === "pickup" ? "Pickup Kuchai Lama, KL" : `Delivery ${input.region}: ${address}`}. ${lines.map((line) => `${line.quantity} x ${line.name}; ${line.notes}${line.reference ? `; reference ${origin}${line.reference}` : ""}`).join(" | ")}. ${notes}`.slice(0, 4000) }, reference: orderId, success_redirect: `${origin}/payment/return/?order=${orderId}`, failure_redirect: `${origin}/payment/return/?order=${orderId}`, cancel_redirect: `${origin}/cart/`, send_receipt: true }) });
  } catch { return errorJson("CHIP checkout is temporarily unavailable. Please try again or contact us on WhatsApp.", 502); }
  let checkoutUrl;
  try { checkoutUrl = new URL(purchase.checkout_url); } catch { return errorJson("CHIP did not return a checkout page.", 502); }
  if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "gate.chip-in.asia" || !purchase.id || purchase.purchase?.total !== total || purchase.brand_id !== env.CHIP_BRAND_ID || purchase.is_test !== false) return errorJson("CHIP checkout could not be verified. Please contact us.", 502);
  await env.BUCKET.put(`orders/${orderId}`, JSON.stringify({ ...order, purchaseId: purchase.id, status: "pending" }));
  return Response.json({ checkoutUrl: checkoutUrl.href, orderId }, { headers: { "cache-control": "no-store" } });
}

async function orderStatus(id, env) {
  if (!ORDER_ID_PATTERN.test(id) || !env.BUCKET || !env.CHIP_SECRET_KEY) return errorJson("Order not found.", 404);
  const stored = await env.BUCKET.get(`orders/${id}`);
  if (!stored) return errorJson("Order not found.", 404);
  const order = await stored.json();
  if (!order.purchaseId) return Response.json({ status: "pending" }, { headers: { "cache-control": "no-store" } });
  const purchase = await chipRequest(env, `${order.purchaseId}/`);
  if (purchase.id !== order.purchaseId || purchase.reference !== id || purchase.brand_id !== env.CHIP_BRAND_ID || purchase.purchase?.total !== order.total || purchase.is_test !== false) return errorJson("Payment could not be verified. Please contact us.", 502);
  const status = ["paid", "cleared", "settled"].includes(purchase.status) ? "paid" : ["error", "cancelled", "expired", "blocked"].includes(purchase.status) ? "failed" : "pending";
  if (status !== order.status) await env.BUCKET.put(`orders/${id}`, JSON.stringify({ ...order, status, checkedAt: Date.now() }));
  return Response.json({ status, orderId: id }, { headers: { "cache-control": "no-store" } });
}

function imageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && [82, 73, 70, 70].every((value, index) => bytes[index] === value) && [87, 69, 66, 80].every((value, index) => bytes[index + 8] === value)) return "image/webp";
  return null;
}

async function readSmallBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function cleanupOldImages(bucket, today) {
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString().slice(0, 10);
  const old = await bucket.list({ prefix: "reference/", limit: 50 });
  for (const object of old.objects) {
    const date = object.key.slice("reference/".length, "reference/".length + 10);
    if (date >= cutoff || date > today) break;
    await bucket.delete(object.key);
  }
  const oldCounters = await bucket.list({ prefix: "rate/", limit: 50 });
  for (const object of oldCounters.objects) {
    const date = object.key.slice("rate/".length, "rate/".length + 10);
    if (date >= today) break;
    await bucket.delete(object.key);
  }
}

async function uploadReference(request, env, ctx) {
  const bucket = env.BUCKET;
  if (!bucket) return errorJson("Image uploads are temporarily unavailable.", 503);
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) return errorJson("Please upload from the UDESIGN website.", 403);
  const declaredType = request.headers.get("content-type")?.split(";")[0].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(declaredType)) return errorJson("Choose a JPG, PNG or WebP image.", 415);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) return errorJson("Choose an image under 5 MB.", 413);
  const bytes = await readSmallBody(request);
  if (!bytes?.length) return errorJson("Choose an image under 5 MB.", 413);
  const actualType = imageType(bytes);
  if (!actualType || actualType !== declaredType) return errorJson("This file is not a supported image.", 415);

  const today = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${today}:${ip}`));
  const ipHash = Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const perIpPrefix = `rate/${today}/${ipHash}/`;
  const [perIp, global] = await Promise.all([
    bucket.list({ prefix: perIpPrefix, limit: MAX_PER_IP_PER_DAY }),
    bucket.list({ prefix: `rate/${today}/`, limit: MAX_TOTAL_PER_DAY }),
  ]);
  if (perIp.objects.length >= MAX_PER_IP_PER_DAY || global.objects.length >= MAX_TOTAL_PER_DAY) return errorJson("Image upload limit reached for today. Please send your photo in WhatsApp instead.", 429);

  const id = `${today}-${crypto.randomUUID()}`;
  await bucket.put(`reference/${id}`, bytes, { httpMetadata: { contentType: actualType }, customMetadata: { createdAt: String(Date.now()) } });
  await bucket.put(`${perIpPrefix}${id}`, "");
  ctx.waitUntil(cleanupOldImages(bucket, today).catch(() => {}));
  return Response.json({ id, url: `/api/reference/${id}/` }, { status: 201, headers: { "cache-control": "no-store" } });
}

async function getReference(id, env, method) {
  if (!ID_PATTERN.test(id)) return new Response("Not found", { status: 404 });
  const bucket = env.BUCKET;
  if (!bucket) return new Response("Image temporarily unavailable", { status: 503 });
  const key = `reference/${id}`;
  const object = await bucket.get(key);
  if (!object) return new Response("Image not found", { status: 404 });
  const uploadedAt = Number(object.customMetadata?.createdAt);
  if (!Number.isFinite(uploadedAt) || Date.now() - uploadedAt > MAX_AGE_MS) {
    await bucket.delete(key);
    return new Response("Image link expired", { status: 410 });
  }
  const type = object.httpMetadata?.contentType;
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return new Response("Not found", { status: 404 });
  return new Response(method === "HEAD" ? null : object.body, {
    headers: {
      "content-type": type,
      "content-disposition": "inline",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}

function decodeGzip(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
}

function staticResponse(url, method) {
  const pathname = url.pathname;
  let path = pathname;
  if (path.endsWith("/")) path += "index.html";
  let asset = ASSETS[path];
  if (!asset && !pathname.includes(".") && !pathname.endsWith("/")) {
    asset = ASSETS[`${pathname}/index.html`];
    if (asset) return Response.redirect(new URL(`${pathname}/`, url), 308);
  }
  const status = asset ? 200 : 404;
  if (!asset) asset = ASSETS["/404.html"];
  if (!asset) return new Response("Not found", { status: 404 });
  const [type, base64] = asset;
  const isHtml = type.startsWith("text/html");
  return new Response(method === "HEAD" ? null : decodeGzip(base64), {
    status,
    headers: {
      "content-type": type,
      "cache-control": isHtml || pathname.endsWith(".txt") ? "public, max-age=0, must-revalidate" : pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/checkout/status/") {
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
        return Response.json({ available: Boolean(env.CHIP_SECRET_KEY && env.CHIP_BRAND_ID && env.BUCKET) }, { headers: { "cache-control": "no-store" } });
      }
      if (url.pathname === "/api/checkout/") {
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
        return await createCheckout(request, env);
      }
      const orderMatch = /^\/api\/orders\/([^/]+)\/status\/?$/.exec(url.pathname);
      if (orderMatch) {
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
        return await orderStatus(orderMatch[1], env);
      }
      if (url.pathname === "/api/reference/" || url.pathname === "/api/reference") {
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
        return await uploadReference(request, env, ctx);
      }
      const match = /^\/api\/reference\/([^/]+)\/?$/.exec(url.pathname);
      if (match) {
        if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
        return await getReference(match[1], env, request.method);
      }
      if (url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      const oldProduct = /^\/winnie-cake-topper\/topper\/([123])-line\/?$/.exec(url.pathname);
      if (oldProduct) {
        const event = url.searchParams.get("event");
        const eventProduct = `/winnie-cake-topper/event/${event}/${oldProduct[1]}-line/`;
        const destination = event && ASSETS[`${eventProduct}index.html`] ? eventProduct : "/winnie-cake-topper/#choose-event";
        return Response.redirect(new URL(destination, url), 308);
      }
      return staticResponse(url, request.method);
    } catch {
      if (url.pathname.startsWith("/api/")) return errorJson("The service is temporarily unavailable. Please try again.", 503);
      return new Response("The site is temporarily unavailable", { status: 503 });
    }
  },
};
