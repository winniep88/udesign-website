// ASSETS is generated from the Next static export by scripts/build-worker.mjs.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PER_IP_PER_DAY = 5;
const MAX_TOTAL_PER_DAY = 50;
const MAX_AGE_MS = 30 * 86_400_000;
const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function errorJson(message, status) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
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
      if (url.pathname.startsWith("/api/")) return errorJson("The image service is temporarily unavailable. Please try again.", 503);
      return new Response("The site is temporarily unavailable", { status: 503 });
    }
  },
};
