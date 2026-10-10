// Operator-only test. Supply the private access token on stdin; never pass it on the command line.
const site = process.env.UDESIGN_TEST_SITE_URL ?? "https://udesign-three-worlds.winniep88.chatgpt.site";
const origin = new URL(site).origin;
const token = await new Promise((resolve) => {
  let input = "";
  const finish = () => {
    process.stdin.removeListener("data", onData);
    process.stdin.removeListener("end", finish);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    resolve(input.split(/[\r\n]/, 1)[0].trim());
  };
  const onData = (chunk) => {
    input += chunk;
    if (/[\r\n]/.test(input)) finish();
  };
  process.stdin.setEncoding("utf8");
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("data", onData);
  process.stdin.once("end", finish);
  process.stdin.resume();
});
if (token.length < 32) throw new Error("A private test access token is required on stdin.");

const response = await fetch(new URL("/api/test-checkout/", origin), {
  method: "POST",
  headers: { origin, "content-type": "application/json", "x-udesign-test-token": token },
  body: JSON.stringify({
    items: [{ productId: "4306939371", variantId: "4306939371:307123826891", quantity: 1, notes: "CHIP test only" }],
    fulfilment: "pickup",
    customer: { name: "UDESIGN Test", email: "test@example.com", phone: "+60 123456789" },
  }),
});
const result = await response.json();
if (!response.ok || result.test !== true || typeof result.checkoutUrl !== "string") throw new Error(result.error ?? "Test checkout did not start.");
console.log(JSON.stringify({ orderId: result.orderId, checkoutUrl: result.checkoutUrl, test: true }));

