// ASSETS is generated from the Next static export by scripts/build-worker.mjs.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PER_IP_PER_DAY = 5;
const MAX_TOTAL_PER_DAY = 50;
const MAX_AGE_MS = 30 * 86_400_000;
const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27,28}$/;
const SHIPPING = { west: 800, east: 1500, singapore: 2000 };
const CHIP_API = "https://gate.chip-in.asia/api/v1/purchases/";
const CHIP_PUBLIC_KEY_API = "https://gate.chip-in.asia/api/v1/public_key/";
const MAX_CALLBACK_BYTES = 256 * 1024;
const SUPABASE_RPC = /^[a-z_]+$/;

function accountBackendConfig(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY?.startsWith("sb_secret_")) return null;
  let url;
  try { url = new URL(env.SUPABASE_URL); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname)) return null;
  return { url: url.origin, secretKey: env.SUPABASE_SECRET_KEY };
}

function accountPublicConfig(env) {
  const backend = accountBackendConfig(env);
  if (env.ACCOUNTS_ENABLED !== "true" || env.SUPABASE_EMAIL_READY !== "true" || !backend || !env.SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_")) return null;
  return { ...backend, publishableKey: env.SUPABASE_PUBLISHABLE_KEY };
}

async function verifiedAccount(request, config) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9._~+/-]{20,8192})$/.exec(authorization);
  if (!match) return false;
  const response = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.publishableKey, authorization: `Bearer ${match[1]}` } });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error(`Supabase Auth ${response.status}`);
  const user = await response.json();
  return typeof user.id === "string" && /^[0-9a-f-]{36}$/.test(user.id) && typeof user.email === "string" && user.email_confirmed_at ? user : false;
}

async function accountRpc(config, name, parameters) {
  if (!config || !SUPABASE_RPC.test(name)) throw new Error("Account service unavailable");
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: config.secretKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(parameters),
  });
  if (!response.ok) throw new Error(`Account service ${name} ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

async function accountRows(config, path) {
  if (!config) throw new Error("Account service unavailable");
  const response = await fetch(`${config.url}/rest/v1/${path}`, { headers: { apikey: config.secretKey, accept: "application/json" } });
  if (!response.ok) throw new Error(`Account service read ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid account service response");
  return rows;
}

async function ownerAccount(request, env) {
  const config = accountPublicConfig(env);
  if (!config || !env.UDESIGN_OWNER_USER_ID) return { error: errorJson("Owner dashboard is not set up yet.", 503) };
  const user = await verifiedAccount(request, config);
  if (!user) return { error: errorJson("Please sign in to your owner account.", 401) };
  if (user.id !== env.UDESIGN_OWNER_USER_ID) return { error: errorJson("Owner access required.", 403) };
  const members = await accountRows(config, `admin_members?select=user_id&user_id=eq.${user.id}&role=eq.owner&limit=1`);
  if (members.length !== 1 || members[0].user_id !== user.id) return { error: errorJson("Owner access required.", 403) };
  return { config, user };
}

function ownerOrderSummary(row) {
  return {
    ...row,
    status: row.order_status === "completed" ? "completed" : row.payment_status,
    discount_sen: (row.voucher_discount_sen ?? 0) + (row.points_discount_sen ?? 0),
  };
}

async function ownerCustomerLookup(request, env) {
  const owner = await ownerAccount(request, env);
  if (owner.error) return owner.error;
  const email = cleanString(new URL(request.url).searchParams.get("email"), 254)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorJson("Enter a valid customer email.", 400);
  const match = await accountRpc(owner.config, "admin_lookup_verified_customer", { p_email: email });
  if (!match) return errorJson("No verified customer account found for this email.", 404);
  if (!ORDER_ID_PATTERN.test(match.user_id) || match.email?.toLowerCase() !== email) throw new Error("Invalid verified customer lookup");
  return Response.json({ userId: match.user_id, email: match.email }, { headers: { "cache-control": "no-store" } });
}

async function ownerOrders(request, env, id = null) {
  const owner = await ownerAccount(request, env);
  if (owner.error) return owner.error;
  if (id) {
    if (!ORDER_ID_PATTERN.test(id)) return errorJson("Order not found.", 404);
    const [orders, items] = await Promise.all([
      accountRows(owner.config, `customer_orders?select=*&id=eq.${id}&limit=1`),
      accountRows(owner.config, `customer_order_items?select=*&order_id=eq.${id}`),
    ]);
    if (!orders.length) return errorJson("Order not found.", 404);
    let currentMarketing = null;
    const customerId = orders[0].user_id;
    if (customerId && ORDER_ID_PATTERN.test(customerId)) {
      try {
        const [profiles, preferences] = await Promise.all([
          accountRows(owner.config, `customer_profiles?select=email,email_verified_at,whatsapp_phone&user_id=eq.${customerId}&limit=1`),
          accountRows(owner.config, `marketing_preferences?select=email_opt_in,whatsapp_opt_in,updated_at&user_id=eq.${customerId}&limit=1`),
        ]);
        if (profiles.length === 1 && profiles[0].email_verified_at && preferences.length === 1) {
          currentMarketing = {
            email: profiles[0].email,
            whatsappPhone: profiles[0].whatsapp_phone,
            emailOptIn: preferences[0].email_opt_in === true,
            whatsappOptIn: preferences[0].whatsapp_opt_in === true,
            updatedAt: preferences[0].updated_at,
          };
        }
      } catch (error) {
        console.error("Could not load current marketing choices for owner order detail", error);
      }
    }
    return Response.json({ order: ownerOrderSummary(orders[0]), items, currentMarketing }, { headers: { "cache-control": "no-store" } });
  }
  const orders = await accountRows(owner.config, "customer_orders?select=id,created_at,payment_status,order_status,customer_name,customer_email,customer_phone,total_sen,fulfilment,shipping_sen,voucher_discount_sen,points_discount_sen,chip_mode,source&order=created_at.desc&limit=50");
  return Response.json({ orders: orders.map(ownerOrderSummary) }, { headers: { "cache-control": "no-store" } });
}

async function ownerCreateManualOrder(request, env) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return errorJson("Please use the UDESIGN owner dashboard.", 403);
  const owner = await ownerAccount(request, env);
  if (owner.error) return owner.error;
  if (!request.headers.get("content-type")?.startsWith("application/json")) return errorJson("Check the order details.", 400);
  let input;
  try { const body = await request.text(); if (body.length > 30_000) return errorJson("The order is too large.", 413); input = JSON.parse(body); }
  catch { return errorJson("Check the order details.", 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return errorJson("Check the order details.", 400);
  const name = cleanString(input?.customer?.name, 100);
  const email = cleanString(input?.customer?.email, 150);
  const phone = cleanString(input?.customer?.phone, 30);
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !/^\+?[\d\s()-]{8,30}$/.test(phone)) return errorJson("Enter a customer name, email and phone number.", 400);
  const userId = input.userId ?? null;
  if (userId !== null && !ORDER_ID_PATTERN.test(userId)) return errorJson("Choose a valid customer account.", 400);
  const items = input.items;
  if (!Array.isArray(items) || !items.length || items.length > 20 || !items.every((item) => cleanString(item?.name, 200) && ["projects", "moments", "winnie"].includes(item?.brand) && Number.isInteger(item?.price) && item.price > 0 && item.price <= 1_000_000 && Number.isInteger(item?.quantity) && item.quantity >= 1 && item.quantity <= 99)) return errorJson("Check the products and prices.", 400);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = input.shippingSen ?? 0;
  if (!Number.isInteger(shipping) || shipping < 0 || shipping > 1_000_000 || subtotal + shipping > 1_000_000) return errorJson("Check the delivery price and total.", 400);
  const fulfilment = input.fulfilment;
  if (fulfilment !== "pickup" && fulfilment !== "delivery") return errorJson("Choose pickup or delivery.", 400);
  const region = fulfilment === "delivery" ? input.region : null;
  const address = fulfilment === "delivery" ? cleanString(input.address, 500) : null;
  if (fulfilment === "pickup" && shipping !== 0 || fulfilment === "delivery" && (!["west", "east", "singapore"].includes(region) || !address || address.length < 10)) return errorJson("Check the delivery details.", 400);
  const notes = typeof input.extraNotes === "string" ? input.extraNotes.trim().slice(0, 500) : "";
  const id = crypto.randomUUID();
  const result = await accountRpc(owner.config, "admin_create_manual_order", {
    p_order_id: id, p_user_id: userId, p_customer_name: name, p_customer_email: email, p_customer_phone: phone,
    p_items: items.map((item) => ({ name: item.name.trim(), brand: item.brand, price: item.price, quantity: item.quantity, notes: typeof item.notes === "string" ? item.notes.slice(0, 1000) : "" })),
    p_shipping_sen: shipping, p_fulfilment: fulfilment, p_region: region, p_address: address, p_notes: notes,
  });
  if (result?.order_id !== id || result?.total_sen !== subtotal + shipping || result?.status !== "manual_unpaid") throw new Error("Manual order could not be verified");
  return Response.json({ orderId: id, status: "manual_unpaid", totalSen: result.total_sen }, { status: 201, headers: { "cache-control": "no-store" } });
}

async function ownerOrderAction(request, env, id, action) {
  if (!ORDER_ID_PATTERN.test(id)) return errorJson("Order not found.", 404);
  if (request.headers.get("origin") !== new URL(request.url).origin) return errorJson("Please use the UDESIGN owner dashboard.", 403);
  const owner = await ownerAccount(request, env);
  if (owner.error) return owner.error;
  const existing = await accountRows(owner.config, `customer_orders?select=id,source,chip_mode,chip_purchase_id&id=eq.${id}&limit=1`);
  if (!existing.length) return errorJson("Order not found.", 404);
  if (action === "complete") {
    await accountRpc(owner.config, "checkout_mark_completed", { p_order_id: id });
    return Response.json({ orderId: id, status: "completed" }, { headers: { "cache-control": "no-store" } });
  }
  if (action === "reconcile") {
    if (existing[0].chip_mode !== "live" || !existing[0].chip_purchase_id) return errorJson("This order does not have a CHIP payment to check.", 400);
    const payment = await orderStatus(id, env);
    return payment;
  }
  if (action === "manual-paid" || action === "manual-refunded") {
    if (existing[0].source !== "manual") return errorJson("This is not a manual order.", 400);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return errorJson("Please confirm the manual payment action.", 400);
    let input;
    try { const body = await request.text(); if (body.length > 1000) return errorJson("Request too large.", 413); input = JSON.parse(body); }
    catch { return errorJson("Please confirm the manual payment action.", 400); }
    if (action === "manual-paid" && input?.confirmedReceived !== true || action === "manual-refunded" && input?.confirmedRefunded !== true) return errorJson("Please confirm the manual payment action.", 400);
    const result = await accountRpc(owner.config, action === "manual-paid" ? "admin_mark_manual_paid" : "admin_record_manual_full_refund", { p_order_id: id });
    return Response.json({ orderId: id, status: result?.status }, { headers: { "cache-control": "no-store" } });
  }
  return errorJson("Not found.", 404);
}

async function syncAccountPayment(env, order, status) {
  if (!order.accountStored) return;
  const config = accountBackendConfig(env);
  if (!config) throw new Error("Account service unavailable");
  if (["paid", "refunding", "refund_review"].includes(status) && !["paid", "refunding", "refund_review", "refunded"].includes(order.status)) {
    await accountRpc(config, "checkout_mark_paid", { p_order_id: order.id, p_chip_purchase_id: order.purchaseId, p_paid_total_sen: order.total, p_chip_mode: order.chipMode });
  } else if (status === "failed" && order.status === "pending") {
    await accountRpc(config, "checkout_release_order", { p_order_id: order.id });
  }
}

// A return from CHIP's checkout does not cancel its purchase. Only CHIP's
// cancelled state (including a successful /cancel/ request) makes it safe to
// release a pending voucher or points reservation.
function chipPaymentStatus(status) {
  if (["paid", "cleared", "settled"].includes(status)) return "paid";
  if (status === "refunded") return "refund_review";
  if (status === "pending_refund") return "refunding";
  if (status === "cancelled") return "failed";
  return "pending";
}

function matchesChipPurchase(purchase, order, env, isTest) {
  return purchase?.id === order.purchaseId && purchase.reference === order.id &&
    purchase.brand_id === env.CHIP_BRAND_ID && purchase.is_test === isTest &&
    purchase.purchase?.currency === "MYR" && purchase.purchase?.total === order.total;
}

async function reconcilePendingAccountCheckout(env, accountStore, account, chip) {
  const rows = await accountRows(accountStore, `customer_orders?select=id,created_at,chip_mode,chip_purchase_id,total_sen&user_id=eq.${account.id}&source=eq.chip&order_status=eq.pending_payment&payment_status=eq.pending&limit=1`);
  if (!rows.length) return null;
  const previous = rows[0];
  if (!ORDER_ID_PATTERN.test(previous.id) || previous.chip_mode !== "live" || !Number.isInteger(previous.total_sen)) {
    return errorJson("Your previous checkout needs review. Please contact us before paying again.", 409);
  }
  const stored = await env.BUCKET.get(`orders/${previous.id}`);
  const saved = stored ? await stored.json() : null;
  if (saved && (saved.id !== previous.id || saved.userId !== account.id || saved.total !== previous.total_sen || saved.chipMode !== "live" || (previous.chip_purchase_id && saved.purchaseId && saved.purchaseId !== previous.chip_purchase_id))) {
    return errorJson("Your previous checkout needs review. Please contact us before paying again.", 409);
  }
  const purchaseId = previous.chip_purchase_id || saved?.purchaseId;
  if (!purchaseId) {
    // Another request may still be creating its CHIP purchase. A stale order
    // with no payment link ever returned can be released after that request
    // has had time to finish.
    const age = Date.now() - Date.parse(previous.created_at);
    if (!Number.isFinite(age) || age < 5 * 60_000) return errorJson("Your previous checkout is still being prepared. Please try again shortly.", 409);
    await accountRpc(accountStore, "checkout_release_order", { p_order_id: previous.id });
    if (saved) await env.BUCKET.put(`orders/${previous.id}`, JSON.stringify({ ...saved, status: "failed", checkedAt: Date.now() }));
    return null;
  }
  if (typeof purchaseId !== "string" || purchaseId.length > 100) return errorJson("Your previous checkout needs review. Please contact us before paying again.", 409);
  const order = { id: previous.id, purchaseId, total: previous.total_sen };
  const getPurchase = async () => {
    const purchase = await chipRequest(chip.secretKey, `${purchaseId}/`);
    if (!matchesChipPurchase(purchase, order, env, false)) throw new Error("Previous CHIP purchase does not match the order");
    return purchase;
  };
  let purchase = await getPurchase();
  if (purchase.status !== "cancelled" && !["paid", "cleared", "settled", "refunded", "pending_refund", "hold", "pending_release", "pending_capture", "preauthorized", "pending_execute", "pending_charge"].includes(purchase.status)) {
    // A failure, viewed page or overdue invoice can still be paid. Ask CHIP
    // to cancel it before making the voucher or points available again.
    try { await chipRequest(chip.secretKey, `${purchaseId}/cancel/`, { method: "POST" }); }
    catch { /* A payment may have won the race. Read CHIP's final state. */ }
    purchase = await getPurchase();
  }
  if (purchase.status === "cancelled") {
    await accountRpc(accountStore, "checkout_release_order", { p_order_id: previous.id });
    if (saved) await env.BUCKET.put(`orders/${previous.id}`, JSON.stringify({ ...saved, purchaseId, status: "failed", checkedAt: Date.now() }));
    return null;
  }
  if (["paid", "cleared", "settled"].includes(purchase.status)) {
    if (!previous.chip_purchase_id) await accountRpc(accountStore, "checkout_attach_payment", { p_order_id: previous.id, p_chip_purchase_id: purchaseId });
    await accountRpc(accountStore, "checkout_mark_paid", { p_order_id: previous.id, p_chip_purchase_id: purchaseId, p_paid_total_sen: previous.total_sen, p_chip_mode: "live" });
    if (saved) await env.BUCKET.put(`orders/${previous.id}`, JSON.stringify({ ...saved, purchaseId, status: "paid", checkedAt: Date.now() }));
    return errorJson(`Your previous payment was received. Please check order ${previous.id} before paying again.`, 409);
  }
  return errorJson(`Your previous payment is still being checked. Please contact us about order ${previous.id} before paying again.`, 409);
}

async function cancelUnreturnedPurchase(env, chip, order, accountStore, purchaseId) {
  if (typeof purchaseId !== "string" || !purchaseId || purchaseId.length > 100) return false;
  await env.BUCKET.put(`orders/${order.id}`, JSON.stringify({ ...order, purchaseId, status: "pending" }));
  try {
    await chipRequest(chip.secretKey, `${purchaseId}/cancel/`, { method: "POST" });
    const purchase = await chipRequest(chip.secretKey, `${purchaseId}/`);
    if (purchase.id !== purchaseId || purchase.reference !== order.id || purchase.brand_id !== env.CHIP_BRAND_ID || purchase.is_test !== chip.isTest || purchase.status !== "cancelled") return false;
    if (order.accountStored) await accountRpc(accountStore, "checkout_release_order", { p_order_id: order.id });
    await env.BUCKET.put(`orders/${order.id}`, JSON.stringify({ ...order, purchaseId, status: "failed" }));
    return true;
  } catch { return false; }
}

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
      const validLines = [1, 2, 3].includes(t.lineCount) && Array.isArray(t.wording) && t.wording.length === t.lineCount && t.wording.every((s) => cleanString(s, 80));
      const validSize = [10, 13, 15, 18, 20].includes(t.sizeCm) && (t.lineCount !== 3 || t.sizeCm >= 13);
      const characterLimits = { 10: 30, 13: 40, 15: 50, 18: 60, 20: 80 };
      const wordLimits = { 10: 2, 13: 5, 15: 8, 18: 10, 20: 14 };
      const wordCount = validLines ? t.wording.join(" ").trim().split(/\s+/u).filter(Boolean).length : 0;
      const validWording = validLines && t.wording.join("").length <= (characterLimits[t.sizeCm] ?? 0) && wordCount <= (wordLimits[t.sizeCm] ?? 0);
      const finishes = { cardstock: ["Glitter Black", "Glitter Dark Blue", "Glitter Green", "Glitter Gold", "Glitter Pink", "Glitter Purple", "Glitter Silver", "Matte Black", "Shiny Gold", "Shiny Rose Gold", "Shiny Silver"], acrylic: ["Black", "Blue", "Green", "Grey", "Matte gold", "Mirror Gold", "Mirror Rose Gold", "Mirror Silver", "Pink", "Red", "Yellow"], wood: ["Natural wood", "Brown wood"] };
      if (!validEvent || !validWording || !validSize || !finishes[t.material]?.includes(t.finish) || (t.details && !cleanString(t.details, 120)) || (t.fontFamily && (typeof t.fontFamily !== "string" || t.fontFamily.length > 80 || !/^[\p{L}\p{N} .'-]+$/u.test(t.fontFamily)))) throw new Error("Check the cake topper choices.");
      price = TOPPER_PRICES[t.material]?.[t.sizeCm] + (TOPPER_PRICES.finishExtras[t.finish] ?? 0);
      name = `Custom Cake Topper · ${t.material}, ${t.finish}, ${t.sizeCm}cm${t.fontFamily ? ` · ${t.fontFamily}` : ""}`;
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

function chipConfig(env, mode) {
  if (!env.BUCKET || !env.CHIP_BRAND_ID) return null;
  if (mode === "live" && env.CHIP_LIVE_ENABLED === "true" && env.CHIP_SECRET_KEY) return { mode, secretKey: env.CHIP_SECRET_KEY, isTest: false };
  if (mode === "test" && env.CHIP_TEST_ENABLED === "true" && env.CHIP_TEST_SECRET_KEY && typeof env.CHIP_TEST_ACCESS_TOKEN === "string" && env.CHIP_TEST_ACCESS_TOKEN.length >= 32) return { mode, secretKey: env.CHIP_TEST_SECRET_KEY, isTest: true };
  return null;
}

function liveCheckoutReady(env) {
  return Boolean(chipConfig(env, "live") && /^-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----\s*$/.test(env.CHIP_REFUND_WEBHOOK_PUBLIC_KEY ?? ""));
}

async function chipRequest(secretKey, path, options = {}) {
  const response = await fetch(`${CHIP_API}${path}`, { ...options, headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/json" } });
  if (!response.ok) throw new Error(`CHIP API ${response.status}`);
  return response.json();
}

async function chipPublicKey(secretKey) {
  const response = await fetch(CHIP_PUBLIC_KEY_API, { headers: { authorization: `Bearer ${secretKey}` } });
  if (!response.ok) throw new Error(`CHIP public key ${response.status}`);
  return importChipPublicKey(await response.text());
}

function importChipPublicKey(pem) {
  const match = /^-----BEGIN PUBLIC KEY-----\s+([A-Za-z0-9+/=\s]+)\s+-----END PUBLIC KEY-----\s*$/.exec(pem);
  if (!match) throw new Error("Invalid CHIP public key");
  const binary = atob(match[1].replace(/\s/g, ""));
  const der = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return crypto.subtle.importKey("spki", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}

async function readCallbackBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_CALLBACK_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

async function chipSuccessCallback(request, env) {
  if (!env.BUCKET) return new Response("Unavailable", { status: 503 });
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CALLBACK_BYTES) return new Response("Too large", { status: 413 });
  const signatureHeader = request.headers.get("x-signature");
  if (!signatureHeader || !/^[A-Za-z0-9+/]+={0,2}$/.test(signatureHeader)) return new Response("Invalid signature", { status: 403 });
  const body = await readCallbackBody(request);
  if (!body?.length) return new Response("Invalid payload", { status: 400 });
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(body)); } catch { return new Response("Invalid payload", { status: 400 }); }
  const id = payload?.reference;
  if (typeof id !== "string" || !ORDER_ID_PATTERN.test(id)) return new Response("Unknown order", { status: 404 });
  const stored = await env.BUCKET.get(`orders/${id}`);
  if (!stored) return new Response("Unknown order", { status: 404 });
  const order = await stored.json();
  if (order.chipMode !== "test" && order.chipMode !== "live") return new Response("Unknown order", { status: 404 });
  const config = chipConfig(env, order.chipMode);
  if (!config || !order.purchaseId) return new Response("Unavailable", { status: 503 });
  let verified;
  try {
    const key = await chipPublicKey(config.secretKey);
    const binary = atob(signatureHeader);
    const signature = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, body);
  } catch { return new Response("Unavailable", { status: 503 }); }
  if (!verified) return new Response("Invalid signature", { status: 403 });
  if (payload.event_type !== "purchase.paid" || payload.status !== "paid" || payload.id !== order.purchaseId || payload.brand_id !== env.CHIP_BRAND_ID || payload.is_test !== config.isTest || payload.purchase?.currency !== "MYR" || payload.purchase?.total !== order.total) return new Response("Invalid purchase", { status: 400 });
  const purchase = await chipRequest(config.secretKey, `${order.purchaseId}/`);
  if (purchase.id !== order.purchaseId || purchase.reference !== id || purchase.brand_id !== env.CHIP_BRAND_ID || purchase.is_test !== config.isTest || purchase.purchase?.currency !== "MYR" || purchase.purchase?.total !== order.total) return new Response("Invalid purchase", { status: 400 });
  const status = ["paid", "cleared", "settled"].includes(purchase.status) ? "paid" : purchase.status === "pending_refund" ? "refunding" : purchase.status === "refunded" ? "refund_review" : null;
  if (!status) return new Response("Still processing", { status: 503 });
  if (order.status !== "refunded" && order.status !== status) {
    await syncAccountPayment(env, order, status);
    await env.BUCKET.put(`orders/${id}`, JSON.stringify({ ...order, status, checkedAt: Date.now() }));
  }
  return new Response("OK");
}

async function chipRefundWebhook(request, env) {
  const chip = chipConfig(env, "live");
  const pem = env.CHIP_REFUND_WEBHOOK_PUBLIC_KEY;
  if (!chip || typeof pem !== "string") return new Response("Unavailable", { status: 503 });
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CALLBACK_BYTES) return new Response("Too large", { status: 413 });
  const signatureHeader = request.headers.get("x-signature");
  if (!signatureHeader || !/^[A-Za-z0-9+/]+={0,2}$/.test(signatureHeader)) return new Response("Invalid signature", { status: 403 });
  const body = await readCallbackBody(request);
  if (!body?.length) return new Response("Invalid payload", { status: 400 });
  let valid;
  try {
    const key = await importChipPublicKey(pem);
    const signature = Uint8Array.from(atob(signatureHeader), (char) => char.charCodeAt(0));
    valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, body);
  } catch { return new Response("Unavailable", { status: 503 }); }
  if (!valid) return new Response("Invalid signature", { status: 403 });
  let payment;
  try { payment = JSON.parse(new TextDecoder().decode(body)); } catch { return new Response("Invalid payload", { status: 400 }); }
  const purchaseId = payment?.related_to?.id;
  const refundAmount = payment?.payment?.amount;
  if (payment?.event_type !== "payment.refunded" || payment.related_to?.type !== "purchase" || typeof purchaseId !== "string" || !purchaseId || purchaseId.length > 100 || typeof payment.id !== "string" || !payment.id || payment.is_test === true || (payment.brand_id && payment.brand_id !== env.CHIP_BRAND_ID) || payment.payment?.payment_type !== "refund" || payment.payment?.is_outgoing !== true || payment.payment?.currency !== "MYR" || !Number.isInteger(refundAmount) || refundAmount <= 0) return new Response("Invalid refund", { status: 400 });
  const purchase = await chipRequest(chip.secretKey, `${purchaseId}/`);
  const id = purchase.reference;
  if (typeof id !== "string" || !ORDER_ID_PATTERN.test(id)) return new Response("Unknown order", { status: 404 });
  const stored = await env.BUCKET.get(`orders/${id}`);
  if (!stored) return new Response("Unknown order", { status: 404 });
  const order = await stored.json();
  if (order.chipMode !== "live" || !matchesChipPurchase(purchase, order, env, false) || refundAmount > order.total) return new Response("Invalid purchase", { status: 400 });
  if (purchase.status !== "refunded") return new Response("Refund still processing", { status: 503 });
  // Each Payment is independently signed. Several partial Payment webhooks
  // could arrive at once, so their amounts must not be summed in R2 without
  // a transactional ledger. Leave those cases for owner review.
  const fullRefund = refundAmount === order.total;
  if (order.accountStored) {
    const accountStore = accountBackendConfig(env);
    if (!accountStore) return new Response("Account service unavailable", { status: 503 });
    const rows = await accountRows(accountStore, `customer_orders?select=id,payment_status,chip_purchase_id,chip_mode,total_sen&id=eq.${id}&limit=1`);
    const ledger = rows[0];
    if (rows.length !== 1 || ledger.id !== id || ledger.chip_mode !== "live" || ledger.total_sen !== order.total || ledger.chip_purchase_id && ledger.chip_purchase_id !== purchaseId) return new Response("Order ledger does not match", { status: 503 });
    if (ledger.payment_status === "pending") {
      if (!ledger.chip_purchase_id) await accountRpc(accountStore, "checkout_attach_payment", { p_order_id: id, p_chip_purchase_id: purchaseId });
      await accountRpc(accountStore, "checkout_mark_paid", { p_order_id: id, p_chip_purchase_id: purchaseId, p_paid_total_sen: order.total, p_chip_mode: "live" });
    } else if (ledger.payment_status !== "paid" && ledger.payment_status !== "refunded") {
      return new Response("Order ledger needs review", { status: 503 });
    }
    if (fullRefund && ledger.payment_status !== "refunded") await accountRpc(accountStore, "checkout_record_full_refund", { p_order_id: id, p_chip_purchase_id: purchaseId });
  }
  if (order.status !== "refunded") await env.BUCKET.put(`orders/${id}`, JSON.stringify({ ...order, status: fullRefund ? "refunded" : "refund_review", lastRefundAmountSen: refundAmount, checkedAt: Date.now(), ...(fullRefund ? { fullRefundPaymentId: payment.id } : {}) }));
  return new Response("OK");
}

async function createCheckout(request, env, mode) {
  const config = chipConfig(env, mode);
  if (!config || mode === "live" && !liveCheckoutReady(env)) return errorJson(mode === "test" ? "Test checkout is unavailable." : "Online payment is awaiting CHIP approval. Please continue on WhatsApp for now.", 503);
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
  const accounts = mode === "live" ? accountPublicConfig(env) : null;
  const accountStore = mode === "live" ? accountBackendConfig(env) : null;
  const hasBearer = Boolean(request.headers.get("authorization"));
  const voucherCode = input.voucherCode === undefined || input.voucherCode === null || input.voucherCode === "" ? null : cleanString(input.voucherCode, 40);
  const redeemPoints = input.redeemPoints === undefined || input.redeemPoints === null ? 0 : input.redeemPoints;
  if ((input.voucherCode && !voucherCode) || !Number.isInteger(redeemPoints) || redeemPoints < 0 || redeemPoints > 1_000_000) return errorJson("Check your voucher or points.", 400);
  if (voucherCode && redeemPoints) return errorJson("Use either a voucher or points for this order.", 400);
  if ((hasBearer || voucherCode || redeemPoints) && !accounts) return errorJson("Customer accounts are temporarily unavailable. Please check out as a guest.", 503);
  let account = null;
  if (hasBearer) {
    account = await verifiedAccount(request, accounts);
    if (!account) return errorJson("Please sign in again before checking out.", 401);
    if (account.email.toLowerCase() !== email.toLowerCase()) return errorJson("Use your account email for this checkout.", 400);
  }
  if ((voucherCode || redeemPoints) && !account) return errorJson("Sign in to use your voucher or points.", 401);
  const marketing = input.marketing ?? {};
  if (typeof marketing !== "object" || marketing === null || Array.isArray(marketing) || (marketing.emailOptIn !== undefined && typeof marketing.emailOptIn !== "boolean") || (marketing.whatsappOptIn !== undefined && typeof marketing.whatsappOptIn !== "boolean")) return errorJson("Check your contact preferences.", 400);
  const emailOptIn = marketing.emailOptIn === true;
  const whatsappOptIn = marketing.whatsappOptIn === true;
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
  const productSubtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  let total = productSubtotal + shipping;
  if (total <= 0 || total > 1_000_000) return errorJson("Please contact us for this order.", 400);
  if (account) {
    try {
      const previousCheckout = await reconcilePendingAccountCheckout(env, accountStore, account, config);
      if (previousCheckout) return previousCheckout;
    } catch {
      return errorJson("We could not verify your previous payment. Please contact us before paying again.", 503);
    }
  }
  const orderId = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const products = lines.map((line) => ({ name: line.name, price: line.price, quantity: line.quantity }));
  if (shipping) products.push({ name: `Delivery · ${input.region}`, price: shipping, quantity: 1 });
  let order = { id: orderId, createdAt: Date.now(), chipMode: mode, customer: { name, email, phone }, fulfilment, region: input.region ?? null, address, notes, lines, productSubtotal, shipping, total, marketing: { emailOptIn, whatsappOptIn }, status: "creating" };
  await env.BUCKET.put(`orders/${orderId}`, JSON.stringify(order));
  if (accountStore) {
    let prepared;
    try {
      prepared = await accountRpc(accountStore, "checkout_prepare_order", {
        p_order_id: orderId,
        p_user_id: account?.id ?? null,
        p_customer_name: name,
        p_customer_email: email,
        p_customer_phone: phone,
        p_items: lines,
        p_shipping_sen: shipping,
        p_fulfilment: fulfilment,
        p_region: fulfilment === "delivery" ? input.region : null,
        p_address: address,
        p_notes: notes,
        p_chip_mode: mode,
        p_voucher_code: voucherCode,
        p_redeem_points: redeemPoints,
        p_email_opt_in: emailOptIn,
        p_whatsapp_opt_in: whatsappOptIn,
      });
    } catch {
      return errorJson(voucherCode || redeemPoints ? "Your voucher or points could not be applied. Please check them and try again." : "Customer records are temporarily unavailable. Please try again.", 503);
    }
    const discount = prepared?.voucher_discount_sen;
    const pointDiscount = prepared?.points_discount_sen;
    const reserved = prepared?.points_reserved;
    if (prepared?.order_id !== orderId || prepared?.product_subtotal_sen !== productSubtotal || prepared?.shipping_sen !== shipping || !Number.isInteger(discount) || discount < 0 || discount > 1000 || !Number.isInteger(pointDiscount) || pointDiscount < 0 || !Number.isInteger(reserved) || reserved < 0 || reserved > redeemPoints || pointDiscount !== reserved * 5 || prepared?.total_sen !== productSubtotal + shipping - discount - pointDiscount || prepared.total_sen < 100 || (voucherCode && discount !== 1000) || (!voucherCode && discount !== 0) || (!redeemPoints && reserved !== 0)) {
      await accountRpc(accountStore, "checkout_release_order", { p_order_id: orderId });
      return errorJson("Checkout totals could not be verified. Please try again.", 503);
    }
    total = prepared.total_sen;
    order = { ...order, accountStored: true, userId: account?.id ?? null, total, voucherDiscount: discount, pointsDiscount: pointDiscount, pointsReserved: reserved };
    await env.BUCKET.put(`orders/${orderId}`, JSON.stringify(order));
  }
  let purchase;
  try {
    purchase = await chipRequest(config.secretKey, "", { method: "POST", body: JSON.stringify({ brand_id: env.CHIP_BRAND_ID, client: { email, full_name: name, phone }, purchase: { currency: "MYR", products, ...(order.accountStored && total !== productSubtotal + shipping ? { total_override: total, total_discount_override: order.voucherDiscount + order.pointsDiscount } : {}), notes: `${config.isTest ? "TEST ONLY — NO REAL ORDER. " : ""}UDESIGN order ${orderId}. ${fulfilment === "pickup" ? "Pickup Kuchai Lama, KL" : `Delivery ${input.region}: ${address}`}. ${lines.map((line) => `${line.quantity} x ${line.name}; ${line.notes}${line.reference ? `; reference ${origin}${line.reference}` : ""}`).join(" | ")}. ${notes}`.slice(0, 4000) }, reference: orderId, success_redirect: `${origin}/payment/return/?order=${orderId}`, failure_redirect: `${origin}/payment/return/?order=${orderId}`, cancel_redirect: `${origin}/payment/return/?order=${orderId}`, success_callback: `${origin}/api/chip/callback/`, send_receipt: !config.isTest }) });
  } catch {
    if (order.accountStored) await accountRpc(accountStore, "checkout_release_order", { p_order_id: orderId });
    await env.BUCKET.put(`orders/${orderId}`, JSON.stringify({ ...order, status: "failed" }));
    return errorJson("CHIP checkout is temporarily unavailable. Please try again or contact us on WhatsApp.", 502);
  }
  let checkoutUrl;
  try { checkoutUrl = new URL(purchase.checkout_url); } catch {
    const cancelled = await cancelUnreturnedPurchase(env, config, order, accountStore, purchase?.id);
    if (!purchase?.id) {
      if (order.accountStored) await accountRpc(accountStore, "checkout_release_order", { p_order_id: orderId });
      await env.BUCKET.put(`orders/${orderId}`, JSON.stringify({ ...order, status: "failed" }));
    }
    return errorJson(cancelled ? "CHIP did not return a checkout page. Please try again." : "CHIP did not return a checkout page. Please contact us before paying again.", 502);
  }
  if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "gate.chip-in.asia" || !purchase.id || purchase.reference !== orderId || purchase.purchase?.currency !== "MYR" || purchase.purchase?.total !== total || purchase.brand_id !== env.CHIP_BRAND_ID || purchase.is_test !== config.isTest) {
    await cancelUnreturnedPurchase(env, config, order, accountStore, purchase?.id);
    if (!purchase?.id) {
      if (order.accountStored) await accountRpc(accountStore, "checkout_release_order", { p_order_id: orderId });
      await env.BUCKET.put(`orders/${orderId}`, JSON.stringify({ ...order, status: "failed" }));
    }
    return errorJson("CHIP checkout could not be verified. Please contact us.", 502);
  }
  if (order.accountStored) {
    await env.BUCKET.put(`orders/${orderId}`, JSON.stringify({ ...order, purchaseId: purchase.id, status: "pending" }));
    try { await accountRpc(accountStore, "checkout_attach_payment", { p_order_id: orderId, p_chip_purchase_id: purchase.id }); }
    catch {
      // The purchase already exists at CHIP. Keep the reservation unless CHIP
      // confirms that it can no longer be paid.
      await cancelUnreturnedPurchase(env, config, order, accountStore, purchase.id);
      return errorJson("We could not finish setting up this payment. Please contact us before paying again.", 503);
    }
  }
  await env.BUCKET.put(`orders/${orderId}`, JSON.stringify({ ...order, purchaseId: purchase.id, status: "pending" }));
  return Response.json({ checkoutUrl: checkoutUrl.href, orderId, test: config.isTest, totalSen: total, voucherDiscountSen: order.voucherDiscount ?? 0, pointsDiscountSen: order.pointsDiscount ?? 0 }, { headers: { "cache-control": "no-store" } });
}

async function orderStatus(id, env) {
  if (!ORDER_ID_PATTERN.test(id) || !env.BUCKET) return errorJson("Order not found.", 404);
  const stored = await env.BUCKET.get(`orders/${id}`);
  if (!stored) return errorJson("Order not found.", 404);
  const order = await stored.json();
  const config = chipConfig(env, order.chipMode === "test" ? "test" : "live");
  if (!config) return errorJson("Order status is unavailable.", 503);
  if (!order.purchaseId) return Response.json({ status: "pending", test: config.isTest }, { headers: { "cache-control": "no-store" } });
  const purchase = await chipRequest(config.secretKey, `${order.purchaseId}/`);
  if (purchase.id !== order.purchaseId || purchase.reference !== id || purchase.brand_id !== env.CHIP_BRAND_ID || purchase.purchase?.total !== order.total || purchase.is_test !== config.isTest) return errorJson("Payment could not be verified. Please contact us.", 502);
  const status = chipPaymentStatus(purchase.status);
  if (["paid", "refunding"].includes(order.status) && ["pending", "failed"].includes(status)) return errorJson("Payment state needs review. Please contact us.", 502);
  if (order.status !== "refunded" && status !== order.status) {
    await syncAccountPayment(env, order, status);
    await env.BUCKET.put(`orders/${id}`, JSON.stringify({ ...order, status, checkedAt: Date.now() }));
  }
  return Response.json({ status: order.status === "refunded" ? "refunded" : status, orderId: id, test: config.isTest }, { headers: { "cache-control": "no-store" } });
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
      if (url.pathname === "/api/account/config/") {
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
        const account = accountPublicConfig(env);
        return Response.json(account ? { enabled: true, url: account.url, publishableKey: account.publishableKey } : { enabled: false, url: null, publishableKey: null }, { headers: { "cache-control": "no-store" } });
      }
      if (url.pathname === "/api/admin/customers/lookup/") {
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
        return await ownerCustomerLookup(request, env);
      }
      if (url.pathname === "/api/admin/orders/") {
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
        return await ownerOrders(request, env);
      }
      if (url.pathname === "/api/admin/orders/manual/") {
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
        return await ownerCreateManualOrder(request, env);
      }
      const adminOrderMatch = /^\/api\/admin\/orders\/([^/]+)\/(complete|reconcile|manual-paid|manual-refunded)?\/?$/.exec(url.pathname);
      if (adminOrderMatch) {
        if (adminOrderMatch[2]) {
          if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
          return await ownerOrderAction(request, env, adminOrderMatch[1], adminOrderMatch[2]);
        }
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
        return await ownerOrders(request, env, adminOrderMatch[1]);
      }
      if (url.pathname === "/api/checkout/status/") {
        if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
        return Response.json({ available: liveCheckoutReady(env) }, { headers: { "cache-control": "no-store" } });
      }
      if (url.pathname === "/api/checkout/") {
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
        return await createCheckout(request, env, "live");
      }
      if (url.pathname === "/api/test-checkout/") {
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
        if (!chipConfig(env, "test") || request.headers.get("x-udesign-test-token") !== env.CHIP_TEST_ACCESS_TOKEN) return errorJson("Not found.", 404);
        return await createCheckout(request, env, "test");
      }
      if (url.pathname === "/api/chip/callback/") {
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
        return await chipSuccessCallback(request, env);
      }
      if (url.pathname === "/api/chip/refund-webhook/") {
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
        return await chipRefundWebhook(request, env);
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
      const oldEventProduct = /^\/winnie-cake-topper\/event\/([^/]+)\/[123]-line\/?$/.exec(url.pathname);
      if (oldEventProduct) {
        const destination = `/winnie-cake-topper/event/${oldEventProduct[1]}/custom-cake-topper/`;
        return Response.redirect(new URL(ASSETS[`${destination}index.html`] ? destination : "/winnie-cake-topper/#choose-event", url), 308);
      }
      const oldProduct = /^\/winnie-cake-topper\/topper\/([123])-line\/?$/.exec(url.pathname);
      if (oldProduct) {
        const event = url.searchParams.get("event");
        const eventProduct = `/winnie-cake-topper/event/${event}/custom-cake-topper/`;
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
