import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const worker = (await import(pathToFileURL(resolve("dist/server/index.js")).href)).default;
const objects = new Map();
const writes = new Map();
const bucket = {
  async put(key, body, options = {}) {
    writes.set(key, (writes.get(key) ?? 0) + 1);
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
const liveKeyOnlyEnv = { ...env, CHIP_SECRET_KEY: "mock-live-secret", CHIP_BRAND_ID: "brand-123" };
assert.deepEqual(await (await worker.fetch(new Request("https://udesign.example/api/checkout/status/"), liveKeyOnlyEnv, context)).json(), { available: false }, "A stored live key alone must not open customer checkout");
const checkoutBody = { items: [{ productId: "4306939371", variantId: "4306939371:307123826891", quantity: 2, notes: "Happy birthday" }], fulfilment: "pickup", customer: { name: "Test Customer", email: "test@example.com", phone: "+60123456789" } };
const checkout = (body) => fetchSite("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(body) });
assert.equal((await checkout(checkoutBody)).status, 503, "Payment remains closed until credentials are installed");
const paidEnv = { ...env, CHIP_LIVE_ENABLED: "true", CHIP_SECRET_KEY: "mock-live-secret", CHIP_BRAND_ID: "brand-123" };
const testToken = "mock-private-test-access-token-123456789";
const testEnv = { ...env, CHIP_TEST_ENABLED: "true", CHIP_TEST_SECRET_KEY: "mock-test-secret", CHIP_TEST_ACCESS_TOKEN: testToken, CHIP_BRAND_ID: "brand-123" };
const liveKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const testKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const refundKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
paidEnv.CHIP_REFUND_WEBHOOK_PUBLIC_KEY = refundKeys.publicKey.export({ type: "spki", format: "pem" });
const signedCallback = (payload, keys) => {
  const body = JSON.stringify(payload);
  return { method: "POST", headers: { "content-type": "application/json", "x-signature": sign("RSA-SHA256", Buffer.from(body), keys.privateKey).toString("base64") }, body };
};
const originalFetch = globalThis.fetch;
let createdPurchase;
let purchaseTotal;
let purchaseStatus = "paid";
let lookupTotalOverride;
const accountCalls = [];
const userId = "7e90917b-9a22-4c8c-b822-f132db774440";
let accountMember = true;
let accountOrder;
let previousPendingOrder;
let cancelAttempts = 0;
let cancelShouldFail = false;
let failNextAttach = false;
const accountEnv = { ...paidEnv, ACCOUNTS_ENABLED: "true", SUPABASE_EMAIL_READY: "true", SUPABASE_URL: "https://udesign-test.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock", SUPABASE_SECRET_KEY: "sb_secret_mock", UDESIGN_OWNER_USER_ID: userId, CHIP_REFUND_WEBHOOK_PUBLIC_KEY: refundKeys.publicKey.export({ type: "spki", format: "pem" }) };
globalThis.fetch = async (url, options) => {
  if (url.startsWith("https://udesign-test.supabase.co/")) {
    const path = new URL(url).pathname;
    if (path === "/auth/v1/user") {
      assert.equal(options.headers.apikey, "sb_publishable_mock");
      return options.headers.authorization === "Bearer valid-user-jwt-token-123456789" ? Response.json({ id: userId, email: "test@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" }) : Response.json({ message: "invalid" }, { status: 401 });
    }
    assert.equal(options.headers.apikey, "sb_secret_mock", "Privileged requests use the server-only key");
    assert.equal(options.headers.authorization, undefined, "Secret keys must not be sent as Bearer tokens");
    if (path.startsWith("/rest/v1/rpc/")) {
      const name = path.slice("/rest/v1/rpc/".length);
      const body = JSON.parse(options.body);
      accountCalls.push({ name, body });
      if (name === "checkout_prepare_order") {
        const productSubtotal = body.p_items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const voucherDiscount = body.p_voucher_code === "WELCOME10" ? 1000 : 0;
        const pointsReserved = body.p_redeem_points;
        if (voucherDiscount && (productSubtotal < 10_000 || !body.p_user_id)) return Response.json({ message: "Invalid welcome voucher" }, { status: 400 });
        return Response.json({ order_id: body.p_order_id, product_subtotal_sen: productSubtotal, shipping_sen: body.p_shipping_sen, voucher_discount_sen: voucherDiscount, points_discount_sen: pointsReserved * 5, points_reserved: pointsReserved, total_sen: productSubtotal + body.p_shipping_sen - voucherDiscount - pointsReserved * 5 });
      }
      if (name === "checkout_attach_payment" && failNextAttach) {
        failNextAttach = false;
        return Response.json({ message: "temporary write failure" }, { status: 503 });
      }
      if (name === "checkout_mark_paid" && accountOrder?.id === body.p_order_id) accountOrder.payment_status = "paid";
      if (name === "checkout_record_full_refund" && accountOrder?.id === body.p_order_id) accountOrder.payment_status = "refunded";
      if (name === "admin_create_manual_order") return Response.json({ order_id: body.p_order_id, total_sen: body.p_items.reduce((sum, item) => sum + item.price * item.quantity, body.p_shipping_sen), status: "manual_unpaid" });
      if (name === "admin_mark_manual_paid") return Response.json({ order_id: body.p_order_id, status: "paid" });
      if (name === "admin_record_manual_full_refund") return Response.json({ order_id: body.p_order_id, status: "refunded" });
      if (name === "admin_lookup_verified_customer") return Response.json(body.p_email === "test@example.com" ? { user_id: userId, email: "test@example.com" } : null);
      return Response.json({ ok: true });
    }
    if (path === "/rest/v1/admin_members") return Response.json(accountMember ? [{ user_id: userId }] : []);
    if (path === "/rest/v1/customer_orders") return Response.json(new URL(url).searchParams.has("user_id") ? previousPendingOrder ? [previousPendingOrder] : [] : accountOrder ? [accountOrder] : []);
    if (path === "/rest/v1/customer_order_items") return Response.json([{ order_id: accountOrder?.id, product_name: "Test product", quantity: 7 }]);
    throw new Error(`Unexpected Supabase path: ${path}`);
  }
  const isTest = options.headers.authorization === "Bearer mock-test-secret";
  if (url === "https://gate.chip-in.asia/api/v1/public_key/") return new Response((isTest ? testKeys : liveKeys).publicKey.export({ type: "spki", format: "pem" }));
  assert.match(url, /^https:\/\/gate\.chip-in\.asia\/api\/v1\/purchases\//);
  if (url.endsWith("/cancel/")) {
    cancelAttempts++;
    if (cancelShouldFail) return Response.json({ error: "payment in flight" }, { status: 400 });
    purchaseStatus = "cancelled";
    return Response.json({ id: "purchase-123", status: "cancelled" });
  }
  if (options.method === "POST") {
    createdPurchase = JSON.parse(options.body);
    purchaseTotal = createdPurchase.purchase.total_override ?? createdPurchase.purchase.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Response.json({ id: "purchase-123", brand_id: "brand-123", is_test: isTest, reference: createdPurchase.reference, purchase: { currency: "MYR", total: purchaseTotal }, checkout_url: "https://gate.chip-in.asia/p/purchase-123/" });
  }
  return Response.json({ id: "purchase-123", brand_id: "brand-123", is_test: isTest, reference: createdPurchase.reference, purchase: { currency: "MYR", total: lookupTotalOverride ?? purchaseTotal }, status: purchaseStatus });
};
try {
  const paidFetch = (path, options) => worker.fetch(new Request(`https://udesign.example${path}`, options), paidEnv, context);
  const testFetch = (path, options) => worker.fetch(new Request(`https://udesign.example${path}`, options), testEnv, context);
  const noRefundHookEnv = { ...paidEnv, CHIP_REFUND_WEBHOOK_PUBLIC_KEY: "" };
  assert.deepEqual(await (await worker.fetch(new Request("https://udesign.example/api/checkout/status/"), noRefundHookEnv, context)).json(), { available: false }, "Live checkout stays closed until its refund webhook key is installed");
  const body = { ...checkoutBody, items: checkoutBody.items.map((item) => ({ ...item, priceSen: 1 })) };
  const start = await paidFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(start.status, 200);
  const { orderId } = await start.json();
  assert.equal(createdPurchase.purchase.products[0].price, 1600, "Server must use catalog price, not browser price");
  assert.equal(createdPurchase.success_callback, "https://udesign.example/api/chip/callback/");
  assert.equal(createdPurchase.cancel_redirect, `https://udesign.example/payment/return/?order=${orderId}`, "Returning from CHIP must show the payment status");
  const livePayload = { event_type: "purchase.paid", status: "paid", id: "purchase-123", reference: orderId, brand_id: "brand-123", is_test: false, purchase: { currency: "MYR", total: purchaseTotal } };
  const liveOrderKey = `orders/${orderId}`;
  const liveWritesBeforeCallback = writes.get(liveOrderKey);
  assert.equal((await paidFetch("/api/chip/callback/", signedCallback(livePayload, testKeys))).status, 403, "A test signature cannot update a live order");
  assert.equal(writes.get(liveOrderKey), liveWritesBeforeCallback);
  const signedLive = signedCallback(livePayload, liveKeys);
  assert.equal((await paidFetch("/api/chip/callback/", { ...signedLive, body: JSON.stringify({ ...livePayload, purchase: { total: 1 } }) })).status, 403, "Tampering with a signed payload must fail");
  assert.equal((await paidFetch("/api/chip/callback/", signedCallback({ ...livePayload, purchase: { currency: "MYR", total: 1 } }, liveKeys))).status, 400, "A signed amount mismatch must fail");
  lookupTotalOverride = 1;
  assert.equal((await paidFetch("/api/chip/callback/", signedLive)).status, 400, "The authoritative CHIP amount must match the stored order");
  lookupTotalOverride = undefined;
  purchaseStatus = "pending_execute";
  assert.equal((await paidFetch("/api/chip/callback/", signedLive)).status, 503, "CHIP should retry while the purchase is still processing");
  assert.equal(writes.get(liveOrderKey), liveWritesBeforeCallback);
  purchaseStatus = "paid";
  assert.equal((await paidFetch("/api/chip/callback/", signedLive)).status, 200, "A signed paid callback records the order");
  assert.equal((await (await bucket.get(liveOrderKey)).json()).status, "paid");
  const liveWritesAfterCallback = writes.get(liveOrderKey);
  assert.equal((await paidFetch("/api/chip/callback/", signedLive)).status, 200, "Duplicate callbacks are accepted");
  assert.equal(writes.get(liveOrderKey), liveWritesAfterCallback, "Duplicate callbacks must not rewrite the order");
  const status = await paidFetch(`/api/orders/${orderId}/status/`);
  assert.deepEqual(await status.json(), { status: "paid", orderId, test: false });
  purchaseStatus = "pending_refund";
  assert.deepEqual(await (await paidFetch(`/api/orders/${orderId}/status/`)).json(), { status: "refunding", orderId, test: false });
  purchaseStatus = "refunded";
  assert.deepEqual(await (await paidFetch(`/api/orders/${orderId}/status/`)).json(), { status: "refund_review", orderId, test: false }, "CHIP refunded does not prove a full refund");
  const writesAfterRefund = writes.get(liveOrderKey);
  assert.equal((await paidFetch("/api/chip/callback/", signedLive)).status, 200, "A delayed paid callback must not reverse a refund");
  assert.equal(writes.get(liveOrderKey), writesAfterRefund);
  purchaseStatus = "paid";
  const topper = { brand: "winnie", product: "Custom Cake Topper", quantity: 1, notes: "", topper: { eventSlug: "birthday", lineCount: 1, material: "cardstock", finish: "Glitter Black", sizeCm: 10, wording: ["Happy Birthday Olivia"] } };
  const topperCheckout = (item) => paidFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify({ ...checkoutBody, items: [item] }) });
  for (const [sizeCm, limit] of [[10, 30], [13, 40], [15, 50], [18, 60], [20, 80]]) {
    const wording = ["a".repeat(limit + 1)];
    assert.equal((await topperCheckout({ ...topper, topper: { ...topper.topper, sizeCm, wording } })).status, 400, `${sizeCm} cm must reject more than ${limit} characters`);
  }
  for (const [sizeCm, limit] of [[10, 2], [13, 5], [15, 8], [18, 10], [20, 14]]) {
    const wording = [Array.from({ length: limit + 1 }, () => "a").join(" ")];
    assert.equal((await topperCheckout({ ...topper, topper: { ...topper.topper, sizeCm, wording } })).status, 400, `${sizeCm} cm must reject more than ${limit} words`);
  }
  const validTopper = await topperCheckout({ ...topper, topper: { ...topper.topper, sizeCm: 20, wording: ["a".repeat(80)] } });
  assert.equal(validTopper.status, 200, "20 cm accepts 80 characters");
  assert.equal(createdPurchase.purchase.products[0].price, 2000);
  assert.deepEqual(await (await testFetch("/api/checkout/status/")).json(), { available: false }, "Test credentials must not enable the public payment button");
  assert.equal((await testFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(checkoutBody) })).status, 503, "Public checkout must stay disabled in test mode");
  assert.equal((await testFetch("/api/test-checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(checkoutBody) })).status, 404, "Test checkout requires private access");
  const testStart = await testFetch("/api/test-checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json", "x-udesign-test-token": testToken }, body: JSON.stringify(checkoutBody) });
  assert.equal(testStart.status, 200, "Private test checkout can create a simulated purchase");
  const testOrder = await testStart.json();
  assert.equal(testOrder.test, true);
  assert.equal(createdPurchase.send_receipt, false, "Test purchases must not send payment receipts");
  assert.match(createdPurchase.purchase.notes, /^TEST ONLY — NO REAL ORDER\./);
  const testPayload = { event_type: "purchase.paid", status: "paid", id: "purchase-123", reference: testOrder.orderId, brand_id: "brand-123", is_test: true, purchase: { currency: "MYR", total: purchaseTotal } };
  assert.equal((await testFetch("/api/chip/callback/", signedCallback(testPayload, testKeys))).status, 200, "The test callback uses the separate test key");
  assert.deepEqual(await (await testFetch(`/api/orders/${testOrder.orderId}/status/`)).json(), { status: "paid", orderId: testOrder.orderId, test: true });

  const accountFetch = (path, options) => worker.fetch(new Request(`https://udesign.example${path}`, options), accountEnv, context);
  const accountConfig = await (await accountFetch("/api/account/config/")).json();
  assert.deepEqual(accountConfig, { enabled: true, url: accountEnv.SUPABASE_URL, publishableKey: accountEnv.SUPABASE_PUBLISHABLE_KEY });
  assert.ok(!JSON.stringify(accountConfig).includes("sb_secret_"), "Server-only key never reaches the browser");
  assert.deepEqual(await (await fetchSite("/api/account/config/")).json(), { enabled: false, url: null, publishableKey: null });
  const noEmailEnv = { ...accountEnv, SUPABASE_EMAIL_READY: "false" };
  assert.deepEqual(await (await worker.fetch(new Request("https://udesign.example/api/account/config/"), noEmailEnv, context)).json(), { enabled: false, url: null, publishableKey: null }, "Account signup stays closed until the email sender is ready");
  assert.equal((await accountFetch("/api/admin/orders/")).status, 401, "Admin data needs a verified login");
  assert.equal((await accountFetch("/api/admin/customers/lookup/?email=test%40example.com")).status, 401, "Customer lookup needs a verified owner login");
  const authHeader = { authorization: "Bearer valid-user-jwt-token-123456789" };
  const memberlessEnv = { ...accountEnv, UDESIGN_OWNER_USER_ID: "e9241661-171d-4574-916c-2f8cad0c99ff" };
  assert.equal((await worker.fetch(new Request("https://udesign.example/api/admin/orders/", { headers: authHeader }), memberlessEnv, context)).status, 403, "Wrong owner ID cannot see private orders");
  accountMember = false;
  assert.equal((await accountFetch("/api/admin/orders/", { headers: authHeader })).status, 403, "A revoked admin_members row blocks access");
  assert.equal((await accountFetch("/api/admin/customers/lookup/?email=test%40example.com", { headers: authHeader })).status, 403, "Revoked owner cannot search customer accounts");
  accountMember = true;
  const linked = await (await accountFetch("/api/admin/customers/lookup/?email=TEST%40example.com", { headers: authHeader })).json();
  assert.deepEqual(linked, { userId, email: "test@example.com" }, "Owner lookup returns only a verified exact email match");
  assert.equal((await accountFetch("/api/admin/customers/lookup/?email=missing%40example.com", { headers: authHeader })).status, 404);
  assert.equal((await accountFetch("/api/admin/customers/lookup/?email=invalid", { headers: authHeader })).status, 400);
  const accountBody = { ...checkoutBody, items: [{ ...checkoutBody.items[0], quantity: 7 }], voucherCode: "WELCOME10", redeemPoints: 0, marketing: { emailOptIn: false, whatsappOptIn: true } };
  const accountCheckout = (body, token = "valid-user-jwt-token-123456789") => accountFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  assert.equal((await accountCheckout(accountBody, "invalid-user-jwt-token-123456789")).status, 401, "Invalid session cannot claim a voucher");
  assert.equal((await accountCheckout({ ...accountBody, redeemPoints: 10 })).status, 400, "Voucher and points cannot stack");
  assert.equal((await accountFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(accountBody) })).status, 401, "Guest cannot claim signed-in voucher");
  const accountStart = await accountCheckout(accountBody);
  assert.equal(accountStart.status, 200, "Verified customer can use the welcome voucher");
  const accountResponse = await accountStart.json();
  assert.equal(accountResponse.totalSen, 10_200, "RM112 in products less RM10 voucher is RM102");
  assert.equal(accountResponse.voucherDiscountSen, 1000);
  assert.equal(createdPurchase.purchase.total_override, 10_200, "CHIP charges the discounted total");
  assert.equal(createdPurchase.purchase.total_discount_override, 1000);
  assert.equal(accountCalls.find((call) => call.name === "checkout_prepare_order")?.body.p_items[0].price, 1600, "Server catalog prices reach the order ledger");
  assert.equal(accountCalls.find((call) => call.name === "checkout_prepare_order")?.body.p_whatsapp_opt_in, true);
  assert.equal(accountCalls.find((call) => call.name === "checkout_prepare_order")?.body.p_email_opt_in, false);
  assert.equal(accountCalls.filter((call) => call.name === "checkout_attach_payment").length, 1);
  accountOrder = { id: accountResponse.orderId, created_at: "2026-10-10T00:00:00Z", payment_status: "pending", order_status: "open", customer_name: "Test Customer", customer_email: "test@example.com", customer_phone: "+60123456789", total_sen: 10_200, fulfilment: "pickup", shipping_sen: 0, voucher_discount_sen: 1000, points_discount_sen: 0, chip_mode: "live", chip_purchase_id: "purchase-123", source: "chip" };
  const ordersList = await (await accountFetch("/api/admin/orders/", { headers: authHeader })).json();
  assert.equal(ordersList.orders[0].discount_sen, 1000);
  const orderDetail = await (await accountFetch(`/api/admin/orders/${accountResponse.orderId}/`, { headers: authHeader })).json();
  assert.equal(orderDetail.items.length, 1);
  const accountPayload = { event_type: "purchase.paid", status: "paid", id: "purchase-123", reference: accountResponse.orderId, brand_id: "brand-123", is_test: false, purchase: { currency: "MYR", total: purchaseTotal } };
  const accountSigned = signedCallback(accountPayload, liveKeys);
  assert.equal((await accountFetch("/api/chip/callback/", accountSigned)).status, 200);
  assert.equal((await accountFetch("/api/chip/callback/", accountSigned)).status, 200);
  assert.equal(accountCalls.filter((call) => call.name === "checkout_mark_paid").length, 1, "Duplicate callbacks cannot double-credit an account");
  assert.equal((await accountFetch(`/api/admin/orders/${accountResponse.orderId}/complete/`, { method: "POST", headers: { ...authHeader, origin: "https://udesign.example" } })).status, 200);
  assert.equal(accountCalls.filter((call) => call.name === "checkout_mark_completed").length, 1);
  assert.equal((await accountFetch(`/api/admin/orders/${accountResponse.orderId}/complete/`, { method: "POST", headers: authHeader })).status, 403, "Cross-site owner mutations are blocked");
  purchaseStatus = "refunded";
  const refund = await accountFetch(`/api/admin/orders/${accountResponse.orderId}/reconcile/`, { method: "POST", headers: { ...authHeader, origin: "https://udesign.example" } });
  assert.equal(refund.status, 200);
  assert.equal((await refund.json()).status, "refund_review");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_record_full_refund").length, 0, "A refunded CHIP status alone cannot reverse loyalty because it might be partial");
  const refundEvent = (id, amount) => ({ event_type: "payment.refunded", id, brand_id: "brand-123", is_test: false, related_to: { type: "purchase", id: "purchase-123" }, payment: { payment_type: "refund", is_outgoing: true, currency: "MYR", amount } });
  assert.equal((await accountFetch("/api/chip/refund-webhook/", signedCallback(refundEvent("refund-partial", 500), liveKeys))).status, 403, "A success-callback signature cannot authenticate a refund webhook");
  const signedPartial = signedCallback(refundEvent("refund-partial", 500), refundKeys);
  assert.equal((await accountFetch("/api/chip/refund-webhook/", { ...signedPartial, body: JSON.stringify(refundEvent("refund-partial", 10_200)) })).status, 403, "A refund amount changed after signing must be rejected");
  const noRefundKeyEnv = { ...accountEnv, CHIP_REFUND_WEBHOOK_PUBLIC_KEY: "" };
  assert.equal((await worker.fetch(new Request("https://udesign.example/api/chip/refund-webhook/", signedPartial), noRefundKeyEnv, context)).status, 503, "A missing refund webhook key cannot reverse rewards");
  assert.equal((await accountFetch("/api/chip/refund-webhook/", signedCallback(refundEvent("refund-partial", 500), refundKeys))).status, 200, "A signed partial refund is acknowledged for owner review");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_record_full_refund").length, 0, "Partial refund never restores voucher or points as if the whole order was refunded");
  assert.equal((await (await bucket.get(`orders/${accountResponse.orderId}`)).json()).status, "refund_review");
  assert.equal((await accountFetch("/api/chip/refund-webhook/", signedCallback(refundEvent("refund-partial", 500), refundKeys))).status, 200, "Duplicate partial refund is counted only once");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_record_full_refund").length, 0);

  const noPaidCallback = await accountCheckout(accountBody);
  assert.equal(noPaidCallback.status, 200);
  const fullRefundOrder = await noPaidCallback.json();
  accountOrder = { ...accountOrder, id: fullRefundOrder.orderId, payment_status: "pending", chip_purchase_id: "purchase-123", total_sen: fullRefundOrder.totalSen };
  const beforeFullRefundPaid = accountCalls.filter((call) => call.name === "checkout_mark_paid").length;
  const fullRefundPayload = refundEvent("refund-full", fullRefundOrder.totalSen);
  assert.equal((await accountFetch("/api/chip/refund-webhook/", signedCallback(fullRefundPayload, refundKeys))).status, 200, "The full signed refund can reconcile a missed paid callback");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_mark_paid").length, beforeFullRefundPaid + 1, "The original payment is recorded before reversing a full refund");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_record_full_refund").length, 1);
  assert.equal((await (await bucket.get(`orders/${fullRefundOrder.orderId}`)).json()).status, "refunded");
  assert.equal((await accountFetch("/api/chip/refund-webhook/", signedCallback(fullRefundPayload, refundKeys))).status, 200, "Duplicate refund webhook is idempotent");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_record_full_refund").length, 1);

  const manualBody = { customer: { name: "Manual Customer", email: "manual@example.com", phone: "+60111111111" }, items: [{ name: "Custom gift", brand: "moments", price: 4500, quantity: 1 }], fulfilment: "pickup", shippingSen: 0 };
  const manualPost = await accountFetch("/api/admin/orders/manual/", { method: "POST", headers: { ...authHeader, origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(manualBody) });
  assert.equal(manualPost.status, 201, "Owner can record a WhatsApp order without moving money");
  const manualResult = await manualPost.json();
  assert.equal(manualResult.status, "manual_unpaid");
  accountOrder = { ...accountOrder, id: manualResult.orderId, source: "manual", chip_mode: null, chip_purchase_id: null };
  assert.equal((await accountFetch(`/api/admin/orders/${manualResult.orderId}/manual-paid/`, { method: "POST", headers: { ...authHeader, origin: "https://udesign.example", "content-type": "application/json" }, body: "{}" })).status, 400, "Manual payment needs explicit owner confirmation");
  const manualPaid = await accountFetch(`/api/admin/orders/${manualResult.orderId}/manual-paid/`, { method: "POST", headers: { ...authHeader, origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify({ confirmedReceived: true }) });
  assert.equal((await manualPaid.json()).status, "paid");
  const manualRefunded = await accountFetch(`/api/admin/orders/${manualResult.orderId}/manual-refunded/`, { method: "POST", headers: { ...authHeader, origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify({ confirmedRefunded: true }) });
  assert.equal((await manualRefunded.json()).status, "refunded");
  const guestBefore = accountCalls.filter((call) => call.name === "checkout_prepare_order").length;
  const guestWithClosedSignup = await worker.fetch(new Request("https://udesign.example/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(checkoutBody) }), noEmailEnv, context);
  assert.equal(guestWithClosedSignup.status, 200, "Guest orders can be recorded before account signup opens");
  const guestPrepares = accountCalls.filter((call) => call.name === "checkout_prepare_order");
  assert.equal(guestPrepares.length, guestBefore + 1);
  assert.equal(guestPrepares.at(-1).body.p_user_id, null);

  purchaseStatus = "viewed";
  const firstRetryable = await accountCheckout(accountBody);
  assert.equal(firstRetryable.status, 200);
  const firstRetryableOrder = await firstRetryable.json();
  previousPendingOrder = { id: firstRetryableOrder.orderId, created_at: new Date().toISOString(), chip_mode: "live", chip_purchase_id: "purchase-123", total_sen: firstRetryableOrder.totalSen };
  const releasesBefore = accountCalls.filter((call) => call.name === "checkout_release_order").length;
  const retry = await accountCheckout(accountBody);
  assert.equal(retry.status, 200, "Retry cancels an unpaid previous CHIP purchase first");
  assert.equal(cancelAttempts, 1);
  assert.equal(accountCalls.filter((call) => call.name === "checkout_release_order").length, releasesBefore + 1, "Voucher releases only after CHIP confirms cancellation");
  assert.equal((await (await bucket.get(`orders/${firstRetryableOrder.orderId}`)).json()).status, "failed");

  const secondRetryableOrder = await retry.json();
  previousPendingOrder = { id: secondRetryableOrder.orderId, created_at: new Date().toISOString(), chip_mode: "live", chip_purchase_id: "purchase-123", total_sen: secondRetryableOrder.totalSen };
  purchaseStatus = "paid";
  const paidRetry = await accountCheckout(accountBody);
  assert.equal(paidRetry.status, 409, "A payment that won the race cannot be cancelled and recreated");
  assert.equal(cancelAttempts, 1);
  assert.equal(accountCalls.filter((call) => call.name === "checkout_release_order").length, releasesBefore + 1);
  assert.equal(accountCalls.at(-1).name, "checkout_mark_paid", "A paid previous order is reconciled into the account ledger");

  purchaseStatus = "expired";
  cancelShouldFail = true;
  const expiredRetry = await accountCheckout(accountBody);
  assert.equal(expiredRetry.status, 409, "An expired purchase may have an in-flight payment, so keep its reservation if cancellation fails");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_release_order").length, releasesBefore + 1);
  cancelShouldFail = false;
  purchaseStatus = "pending_execute";
  const inFlightRetry = await accountCheckout(accountBody);
  assert.equal(inFlightRetry.status, 409, "An in-flight payment must not be cancelled or released");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_release_order").length, releasesBefore + 1);
  lookupTotalOverride = 1;
  assert.equal((await accountCheckout(accountBody)).status, 503, "A mismatched CHIP amount never releases a reservation");
  lookupTotalOverride = undefined;
  previousPendingOrder = undefined;

  const beforeInterruptedRelease = accountCalls.filter((call) => call.name === "checkout_release_order").length;
  purchaseStatus = "viewed";
  failNextAttach = true;
  cancelShouldFail = true;
  const interruptedSetup = await accountCheckout(accountBody);
  assert.equal(interruptedSetup.status, 503, "An unreturned purchase with an interrupted database write does not expose a checkout URL");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_release_order").length, beforeInterruptedRelease, "The reserved voucher stays locked while CHIP can still accept payment");
  const interruptedId = createdPurchase.reference;
  assert.equal((await (await bucket.get(`orders/${interruptedId}`)).json()).status, "pending");
  previousPendingOrder = { id: interruptedId, created_at: new Date().toISOString(), chip_mode: "live", chip_purchase_id: null, total_sen: 10_200 };
  cancelShouldFail = false;
  const interruptedRetry = await accountCheckout(accountBody);
  assert.equal(interruptedRetry.status, 200, "A later retry can find the CHIP ID in the saved order and cancel it");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_release_order").length, beforeInterruptedRelease + 1);
  previousPendingOrder = undefined;

  const oldUnstartedId = crypto.randomUUID();
  previousPendingOrder = { id: oldUnstartedId, created_at: new Date(Date.now() - 6 * 60_000).toISOString(), chip_mode: "live", chip_purchase_id: null, total_sen: 10_200 };
  const beforeStaleRelease = accountCalls.filter((call) => call.name === "checkout_release_order").length;
  assert.equal((await accountCheckout(accountBody)).status, 200, "A stale database order with no CHIP purchase can be released");
  assert.equal(accountCalls.filter((call) => call.name === "checkout_release_order").length, beforeStaleRelease + 1);
  previousPendingOrder = undefined;

  purchaseStatus = "expired";
  const guestExpired = await accountFetch("/api/checkout/", { method: "POST", headers: { origin: "https://udesign.example", "content-type": "application/json" }, body: JSON.stringify(checkoutBody) });
  assert.equal(guestExpired.status, 200);
  const guestExpiredId = (await guestExpired.json()).orderId;
  assert.equal((await (await accountFetch(`/api/orders/${guestExpiredId}/status/`)).json()).status, "pending", "Expired is not safe to release because CHIP can later report paid");
  purchaseStatus = "cancelled";
  assert.equal((await (await accountFetch(`/api/orders/${guestExpiredId}/status/`)).json()).status, "failed");
} finally { globalThis.fetch = originalFetch; }
console.log("Worker storefront, image upload, CHIP checkout and account ledger checks passed.");
