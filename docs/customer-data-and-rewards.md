# Customer accounts and rewards

The customer migration is `supabase/migrations/20261010204923_customer_accounts_loyalty.sql`.
It, `20261010154500_restrict_internal_trigger.sql`, and
`20261010235036_guest_welcome_voucher_eligibility.sql` were applied to the
UDESIGN-owned `udesign-customer-store` Supabase project (`thixxdxslbvdqgqhyiwf`)
on 10 October 2026. The Supabase CLI was not available in this workspace, so
the SQL files were written directly and applied through the Supabase connector.
Do not apply them again to this project.

All ten public tables have RLS enabled. The security advisor has no warnings;
its one informational finding is intentional: `admin_members` has no browser
policy because no customer may read or write owner roles. The performance
advisor only reports unused indexes on the empty database. SQL privilege checks
confirmed no anonymous access to customer tables and no browser execution of
financial/admin functions. A transaction that created a temporary verified
account, voucher, paid order, 90 earned points, and full refund passed and was
rolled back; the project still has zero customer, order, and point rows.
The guest voucher test in `supabase/tests/guest_welcome_voucher_rollback.sql`
also passed in a rolled-back transaction. It covers a paid guest order before
signup, one after signup, later full refunds, and a pending reservation.

## Data and access

| Data | Table | Browser access |
| --- | --- | --- |
| Verified account email, name, WhatsApp | `customer_profiles` | Read own; edit own name and WhatsApp |
| Separate promotion choices | `marketing_preferences` | Read and edit own; defaults off |
| Saved delivery addresses | `customer_addresses` | Manage own only |
| RM10 welcome offer | `welcome_vouchers` | Read own only |
| Orders and item snapshots | `customer_orders`, `customer_order_items` | Read own only |
| Available/used points history | `loyalty_ledger` | Read own only |
| Owner/staff membership | `admin_members` | No browser access |
| Future editable catalog | `catalog_products`, `catalog_variants` | Read active/available listings only |

RLS is enabled for **every** new public table. There are no anonymous reads of
customer data and no customer writes of vouchers, orders, points, or admin
roles. `service_role` is granted access explicitly for the server; its key must
stay in a server-side secret and never be included in the static website. The
owner dashboard must verify the signed-in user's JWT, then look up their UUID
in `admin_members` using the server key before any admin operation. Grant the
first owner only after verifying which account belongs to UDESIGN; no email
address is assumed in this migration.

Supabase Auth owns the passwordless email identity. On email confirmation,
the auth trigger creates the profile, off-by-default marketing preferences,
and one welcome voucher. The voucher expires at `issued_at + interval '2
months'` (calendar months). Changing an email updates the profile email; it
does not issue another voucher. Customers can keep several addresses and
choose a default with `set_default_address`.
An account's welcome voucher is unavailable when a paid guest or manual order
already exists under its verified email. A full refund restores eligibility
only when no paid order remains. Guest orders are not linked to a later account
for order history or loyalty points; customers must sign in before buying to
earn points. This is the owner's chosen initial rule.

## Checkout service RPC contract

Only the server-only `service_role` may execute financial/admin RPCs. Verify a
customer's JWT *separately* from the service-key request; passing that user
JWT as the RPC Authorization header would make the RPC run as `authenticated`
and fail by design. The Worker must price the cart from the trusted catalog,
validate CHIP's purchase and callback, and supply these values:

1. `checkout_prepare_order(p_order_id uuid, p_user_id uuid, p_customer_name
   text, p_customer_email text, p_customer_phone text, p_items jsonb,
   p_shipping_sen integer, p_fulfilment text, p_region text, p_address text,
   p_notes text, p_chip_mode text, p_voucher_code text, p_redeem_points
   integer, p_email_opt_in boolean, p_whatsapp_opt_in boolean)` returns a
   JSON object with `order_id`, `product_subtotal_sen`, `shipping_sen`,
   `voucher_discount_sen`, `points_discount_sen`, `points_reserved`, and
   `total_sen`. `p_items` is the existing trusted `pricedLines` array with
   `{name, price, quantity, brand, ...}`, where `price` is sen. A guest passes
   `p_user_id=null`, no voucher code, and zero points. For pickup pass null
   region/address and zero shipping. For delivery, west/east/Singapore fees
   are 800/1500/2000 sen. The RPC locks the member row, checks voucher/points,
   and creates the pending order and item snapshots atomically. It allows only
   one pending account checkout at a time to avoid first-order races.
2. `checkout_attach_payment(p_order_id uuid, p_chip_purchase_id text)` saves
   the CHIP purchase ID after a purchase with the returned `total_sen` is
   created. Repeating the same ID is safe; a different ID is rejected.
3. `checkout_release_order(p_order_id uuid)` marks a pending CHIP order failed
   and frees its voucher/point reservation. Call this only if purchase creation
   fails or **CHIP confirms a terminal failed/expired payment**. A shopper
   closing their browser is not a verified failure.
4. `checkout_mark_paid(p_order_id uuid, p_chip_purchase_id text,
   p_paid_total_sen integer, p_chip_mode text)` is called only after independent
   CHIP verification of the purchase ID, live/test mode, currency, brand, and
   amount. It marks the order paid, consumes the voucher and deducts spent
   points once. A second paid callback is idempotent.
5. `checkout_mark_completed(p_order_id uuid)` is an owner-only fulfilment
   action. It awards `floor((product_subtotal_sen - voucher_discount_sen -
   points_discount_sen) / 100)` points once, excluding delivery. A guest
   earns no account points. Each point is worth 5 sen when used later.
6. `checkout_record_full_refund(p_order_id uuid, p_chip_purchase_id text)`
   follows a **verified full live CHIP refund**. It reverses earned points,
   returns redeemed points, and restores the first-order voucher only when
   no other paid order exists. Repeating it is safe. Partial refunds need a
   separate policy and implementation before they are offered.

The CHIP test path should remain in its existing R2 sandbox. Test purchases
must not earn rewards or use a customer's voucher. Promotion choices on a
guest order are stored with that order, but no guest marketing list should
send messages until a working unsubscribe/edit path exists. An account holder
can change both choices in their account. Order and mock-up contact is
separate from promotional consent.

## Manual WhatsApp orders

The owner dashboard can use service-only `admin_lookup_verified_customer`
with the customer's exact email to get `{user_id,email}` or null. It can then
call `admin_create_manual_order` with an owner-attested customer, priced item
array and optional `p_user_id` (only if the confirmed account email matches).
It starts with `payment_status='manual_unpaid'`.
After checking the actual payment, call `admin_mark_manual_paid`, then
`checkout_mark_completed` when fulfilled. The same account receives points
only after both steps. `admin_record_manual_full_refund` reverses points for a
full manual refund. These RPCs are also service-only; the Worker must check
the owner role before calling them. Enter actual sale prices in the item
array, including any agreed manual discount.

## Verification after applying

1. Run Supabase database advisors and resolve security findings.
2. Verify `anon` cannot select profiles, preferences, addresses, vouchers,
   orders, items, ledger, or admin roles. Verify account A cannot select or
   change account B's rows. Verify an authenticated client cannot insert a
   voucher, paid order, loyalty entry, or admin membership.
3. Sign up and confirm a test email. Check exactly one profile, one
   off-by-default preference row and one voucher with the correct expiry.
4. Test a RM100 product cart: voucher returns 1000 sen discount. A duplicate
   pending checkout fails. Release the pending order and check the voucher is
   available again. Pay the order and check the voucher cannot be used twice.
5. Complete the RM100/RM10-discount order twice: exactly one 90-point earn
   entry should exist. Refund it twice: exactly one -90 reversal should
   exist. Test point redemption and full refund restoration separately.
6. Test an owner-entered unpaid manual order; it must earn no points until
   marked paid **and** completed.

No email sender is configured by this migration. A verified domain and a
transactional mail service are required before public sign-in and welcome
voucher emails are advertised. The website should keep account/reward features
off until the database, email delivery, privacy controls, and a live order
test are ready.
