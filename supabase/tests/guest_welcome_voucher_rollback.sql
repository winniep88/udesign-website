-- Run after the guest-welcome-voucher migration. This entire check rolls back.
begin;

do $test$
declare
  v_email_prior text := 'voucher-prior-' || replace(gen_random_uuid()::text, '-', '') || '@example.invalid';
  v_email_later text := 'voucher-later-' || replace(gen_random_uuid()::text, '-', '') || '@example.invalid';
  v_prior_user uuid := gen_random_uuid();
  v_later_user uuid := gen_random_uuid();
  v_prior_order uuid := gen_random_uuid();
  v_guest_order uuid := gen_random_uuid();
  v_other_guest_order uuid := gen_random_uuid();
  v_reservation uuid := gen_random_uuid();
  v_voucher public.welcome_vouchers%rowtype;
begin
  -- A completed guest order before signup must make the new voucher unusable.
  insert into public.customer_orders (
    id, source, customer_name, customer_email, customer_phone,
    fulfilment, product_subtotal_sen, total_sen, payment_status, order_status
  ) values (
    v_prior_order, 'manual', 'Guest Prior', v_email_prior, '+60123456789',
    'pickup', 10000, 10000, 'paid', 'placed'
  );
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    v_prior_user, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_email_prior, '', now(), now(), now()
  );
  select * into strict v_voucher from public.welcome_vouchers
   where user_id = v_prior_user;
  if v_voucher.forfeited_at is null then
    raise exception 'A prior paid guest order left the signup voucher available';
  end if;

  -- A later guest payment should forfeit an existing voucher while preserving
  -- any pending CHIP reservation. Refunding only one of two orders is not enough
  -- to restore it; the last full refund is.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    v_later_user, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', v_email_later, '', now(), now(), now()
  );
  update public.welcome_vouchers
     set reserved_order_id = v_reservation, reserved_at = now()
   where user_id = v_later_user;
  insert into public.customer_orders (
    id, source, customer_name, customer_email, customer_phone,
    fulfilment, product_subtotal_sen, total_sen, payment_status, order_status
  ) values (
    v_guest_order, 'manual', 'Guest Later', upper(v_email_later), '+60123456789',
    'pickup', 10000, 10000, 'manual_unpaid', 'placed'
  );
  update public.customer_orders set payment_status = 'paid', paid_at = now()
   where id = v_guest_order;
  select * into strict v_voucher from public.welcome_vouchers
   where user_id = v_later_user;
  if v_voucher.forfeited_at is null or v_voucher.reserved_order_id is distinct from v_reservation then
    raise exception 'Guest payment must forfeit the voucher without releasing its reservation';
  end if;

  insert into public.customer_orders (
    id, source, customer_name, customer_email, customer_phone,
    fulfilment, product_subtotal_sen, total_sen, payment_status, order_status
  ) values (
    v_other_guest_order, 'manual', 'Another Guest Order', v_email_later, '+60123456789',
    'pickup', 10000, 10000, 'paid', 'placed'
  );
  update public.customer_orders set payment_status = 'refunded', refunded_at = now()
   where id = v_guest_order;
  select * into strict v_voucher from public.welcome_vouchers
   where user_id = v_later_user;
  if v_voucher.forfeited_at is null then
    raise exception 'The voucher was restored while another paid order remained';
  end if;

  update public.customer_orders set payment_status = 'refunded', refunded_at = now()
   where id = v_other_guest_order;
  select * into strict v_voucher from public.welcome_vouchers
   where user_id = v_later_user;
  if v_voucher.forfeited_at is not null or v_voucher.reserved_order_id is distinct from v_reservation then
    raise exception 'The last full refund must restore eligibility without releasing the reservation';
  end if;

  -- Releasing the unrelated pending checkout should now reveal availability.
  update public.welcome_vouchers
     set reserved_order_id = null, reserved_at = null
   where user_id = v_later_user;
  select * into strict v_voucher from public.welcome_vouchers
   where user_id = v_later_user;
  if v_voucher.forfeited_at is not null or v_voucher.reserved_order_id is not null then
    raise exception 'The refunded customer voucher did not become available';
  end if;
end;
$test$;

rollback;
