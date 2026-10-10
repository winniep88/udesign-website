-- Keep the account's visible welcome-voucher state in step with paid guest
-- orders under its verified email. A pending CHIP reservation is left intact:
-- only CHIP's confirmed outcome may release or redeem that reservation.

create function private.forfeit_welcome_voucher_on_insert() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  v_email text;
begin
  select email into v_email from public.customer_profiles
   where user_id = new.user_id and email_verified_at is not null;
  if v_email is not null then
    -- The matching guest-payment trigger takes the same transaction lock.
    -- Whichever transaction commits second sees the other's paid order or
    -- voucher and leaves the visible voucher state correct.
    perform pg_catalog.pg_advisory_xact_lock(754216, pg_catalog.hashtext(lower(v_email)));
  end if;
  if new.redeemed_at is null and new.forfeited_at is null and exists (
    select 1
      from public.customer_profiles p
      join public.customer_orders o
        on o.user_id = p.user_id or lower(o.customer_email) = lower(p.email)
     where p.user_id = new.user_id
       and p.email_verified_at is not null
       and o.payment_status = 'paid'
  ) then
    new.forfeited_at := now();
  end if;
  return new;
end;
$$;

create trigger welcome_voucher_prior_paid_order
  before insert on public.welcome_vouchers
  for each row execute function private.forfeit_welcome_voucher_on_insert();

create function private.sync_welcome_voucher_on_order_payment() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.payment_status is not distinct from old.payment_status then
      return new;
    end if;
  end if;
  if new.payment_status not in ('paid', 'refunded') then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(754216, pg_catalog.hashtext(lower(new.customer_email)));

  update public.welcome_vouchers v
     set forfeited_at = case when exists (
       select 1 from public.customer_orders o
        where o.payment_status = 'paid'
          and (o.user_id = v.user_id or lower(o.customer_email) = lower(p.email))
     ) then coalesce(v.forfeited_at, now()) else null end
    from public.customer_profiles p
   where p.user_id = v.user_id
     and p.email_verified_at is not null
     and v.redeemed_at is null
     and (p.user_id = new.user_id or lower(p.email) = lower(new.customer_email));

  return new;
end;
$$;

create trigger welcome_voucher_order_payment
  after insert or update of payment_status on public.customer_orders
  for each row execute function private.sync_welcome_voucher_on_order_payment();

-- Repair any vouchers issued before this safeguard. Do not touch redeemed
-- vouchers or release pending reservations; their payment flow owns those.
update public.welcome_vouchers v
   set forfeited_at = now()
  from public.customer_profiles p
 where p.user_id = v.user_id
   and p.email_verified_at is not null
   and v.redeemed_at is null
   and v.forfeited_at is null
   and exists (
     select 1 from public.customer_orders o
      where o.payment_status = 'paid'
        and (o.user_id = v.user_id or lower(o.customer_email) = lower(p.email))
   );

revoke all on function private.forfeit_welcome_voucher_on_insert()
  from public, anon, authenticated;
revoke all on function private.sync_welcome_voucher_on_order_payment()
  from public, anon, authenticated;
