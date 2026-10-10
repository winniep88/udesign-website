# CHIP checkout states

Public checkout stays on WhatsApp while FPX Online Banking and DuitNow QR approval is pending. The public `/api/checkout/status/` returns `available: false` unless all of `CHIP_LIVE_ENABLED=true`, `CHIP_SECRET_KEY`, `CHIP_BRAND_ID`, and the R2 `BUCKET` binding exist.

For a simulated purchase, the separate `POST /api/test-checkout/` route requires `CHIP_TEST_ENABLED=true`, `CHIP_TEST_SECRET_KEY`, `CHIP_BRAND_ID`, an R2 `BUCKET` binding, and a private random `CHIP_TEST_ACCESS_TOKEN` of at least 32 characters. The request must send that token in `x-udesign-test-token` and originate from the site. There is no customer-facing test payment button. Never use a live key for this route.

The server calculates product and delivery prices, creates a CHIP Purchase, verifies the returned total, Brand ID, and `is_test` flag, and stores the purchase ID and test/live mode with the order. The return page fetches the purchase status from CHIP; test returns clearly say no real money was collected and no customer order was placed. Simulated purchases have `send_receipt=false`.

The smoke check uses mock CHIP responses and verifies that test credentials cannot enable the public payment button. A real test still requires a CHIP test key and private hosting secrets; the test key is separate from the live key, while the Brand ID is shared. CHIP's available test payment methods can be checked through `GET /payment_methods/?brand_id=...&currency=MYR` using the test key. Do not assume a particular method is available.

Before enabling live checkout: confirm CHIP has approved the intended payment methods; install the live key as a secret; run a low-value end-to-end order and verify the CHIP status, amount, fulfilment, and order record; then explicitly set `CHIP_LIVE_ENABLED=true`. A signed webhook can later update orders even when a customer does not return to the site; the current implementation checks CHIP when the return/status page is visited.

CHIP references: [API](https://developer.chip-in.asia/api.html), [test and live keys](https://blog.chip-in.asia/docs/how-to-get-api-key-api-host-brand-id/), [Collect overview](https://chip-in.asia/collect/payments).
