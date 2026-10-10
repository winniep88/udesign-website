-- UDESIGN customer accounts and order ledger.
-- Supabase CLI was not available when this migration was authored. Apply only
-- after the UDESIGN-owned project exists; never put a service key in the client.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (length(email) between 3 and 254),
  email_verified_at timestamptz,
  full_name text check (full_name is null or length(full_name) <= 100),
  whatsapp_phone text check (whatsapp_phone is null or length(whatsapp_phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_preferences (
  user_id uuid primary key references public.customer_profiles(user_id) on delete cascade,
  email_opt_in boolean not null default false,
  whatsapp_opt_in boolean not null default false,
  email_changed_at timestamptz,
  whatsapp_changed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  label text not null default 'Address' check (length(label) between 1 and 40),
  recipient_name text not null check (length(recipient_name) between 1 and 100),
  phone text not null check (length(phone) between 8 and 30),
  line1 text not null check (length(line1) between 3 and 200),
  line2 text check (line2 is null or length(line2) <= 200),
  city text not null check (length(city) between 1 and 100),
  state text check (state is null or length(state) <= 100),
  postcode text not null check (length(postcode) between 3 and 20),
  country text not null default 'MY' check (country in ('MY', 'SG')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_addresses_user_idx on public.customer_addresses(user_id);
create unique index customer_addresses_one_default_idx
  on public.customer_addresses(user_id) where is_default;

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);

create table public.welcome_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.customer_profiles(user_id) on delete cascade,
  code text not null unique check (length(code) between 12 and 60),
  amount_sen integer not null default 1000 check (amount_sen = 1000),
  minimum_product_subtotal_sen integer not null default 10000 check (minimum_product_subtotal_sen = 10000),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reserved_order_id uuid unique,
  reserved_at timestamptz,
  redeemed_order_id uuid unique,
  redeemed_at timestamptz,
  forfeited_at timestamptz,
  check ((reserved_order_id is null) = (reserved_at is null)),
  check ((redeemed_order_id is null) = (redeemed_at is null)),
  check (expires_at > issued_at)
);

create table public.customer_orders (
  id uuid primary key,
  user_id uuid references public.customer_profiles(user_id) on delete set null,
  source text not null check (source in ('chip', 'manual')),
  chip_mode text check (chip_mode in ('live', 'test')),
  chip_purchase_id text unique,
  customer_name text not null check (length(customer_name) between 1 and 100),
  customer_email text not null check (length(customer_email) between 3 and 254),
  customer_phone text not null check (length(customer_phone) between 8 and 30),
  fulfilment text not null check (fulfilment in ('pickup', 'delivery')),
  region text check (region in ('west', 'east', 'singapore')),
  delivery_address text,
  notes text check (notes is null or length(notes) <= 500),
  product_subtotal_sen integer not null check (product_subtotal_sen >= 0),
  shipping_sen integer not null default 0 check (shipping_sen >= 0),
  voucher_id uuid references public.welcome_vouchers(id),
  voucher_discount_sen integer not null default 0 check (voucher_discount_sen >= 0),
  points_reserved integer not null default 0 check (points_reserved >= 0),
  points_discount_sen integer not null default 0 check (points_discount_sen >= 0),
  total_sen integer not null check (total_sen >= 0),
  payment_status text not null check (payment_status in ('pending', 'manual_unpaid', 'paid', 'failed', 'refunded')),
  order_status text not null check (order_status in ('pending_payment', 'placed', 'in_progress', 'completed', 'cancelled')),
  marketing_email_opt_in boolean not null default false,
  marketing_whatsapp_opt_in boolean not null default false,
  marketing_choice_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  refunded_at timestamptz,
  updated_at timestamptz not null default now(),
  check (total_sen = product_subtotal_sen + shipping_sen - voucher_discount_sen - points_discount_sen),
  check (voucher_discount_sen + points_discount_sen <= product_subtotal_sen),
  check (voucher_id is null or points_reserved = 0),
  check (source <> 'chip' or chip_mode is not null),
  check (source <> 'manual' or chip_mode is null),
  check (fulfilment <> 'delivery' or delivery_address is not null)
);
create index customer_orders_user_created_idx on public.customer_orders(user_id, created_at desc);
create index customer_orders_email_paid_idx on public.customer_orders(lower(customer_email))
  where payment_status = 'paid';
create unique index customer_orders_one_pending_member_idx
  on public.customer_orders(user_id)
  where user_id is not null and order_status = 'pending_payment' and payment_status = 'pending';

create table public.customer_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  product_name text not null check (length(product_name) between 1 and 200),
  brand text not null check (brand in ('projects', 'moments', 'winnie')),
  unit_price_sen integer not null check (unit_price_sen > 0),
  quantity integer not null check (quantity between 1 and 99),
  item_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index customer_order_items_order_idx on public.customer_order_items(order_id);

create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  order_id uuid references public.customer_orders(id),
  entry_type text not null check (entry_type in ('earn', 'redeem', 'earn_reversal', 'redeem_return', 'manual_credit', 'manual_debit')),
  points integer not null check (points <> 0),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  check ((entry_type in ('earn', 'redeem_return', 'manual_credit') and points > 0)
      or (entry_type in ('redeem', 'earn_reversal', 'manual_debit') and points < 0)),
  check ((entry_type in ('manual_credit', 'manual_debit') and order_id is null)
      or (entry_type not in ('manual_credit', 'manual_debit') and order_id is not null))
);
create index loyalty_ledger_user_created_idx on public.loyalty_ledger(user_id, created_at desc);
create unique index loyalty_ledger_one_event_per_order_idx
  on public.loyalty_ledger(order_id, entry_type) where order_id is not null;

-- Future dashboard catalog. Existing static catalog remains the pricing source
-- until a vetted import and admin editor are connected.
create table public.catalog_products (
  id text primary key check (length(id) between 1 and 100),
  brand text not null check (brand in ('projects', 'moments', 'winnie')),
  event_slug text,
  name text not null check (length(name) between 1 and 200),
  description text,
  image_path text,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.catalog_variants (
  id text primary key check (length(id) between 1 and 100),
  product_id text not null references public.catalog_products(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  price_sen integer not null check (price_sen > 0),
  available boolean not null default false,
  options jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index catalog_variants_product_idx on public.catalog_variants(product_id);

create function private.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.stamp_marketing_choice() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.email_opt_in is distinct from old.email_opt_in then
    new.email_changed_at := now();
  end if;
  if new.whatsapp_opt_in is distinct from old.whatsapp_opt_in then
    new.whatsapp_changed_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger customer_profiles_touch before update on public.customer_profiles
  for each row execute function private.touch_updated_at();
create trigger customer_addresses_touch before update on public.customer_addresses
  for each row execute function private.touch_updated_at();
create trigger customer_orders_touch before update on public.customer_orders
  for each row execute function private.touch_updated_at();
create trigger catalog_products_touch before update on public.catalog_products
  for each row execute function private.touch_updated_at();
create trigger catalog_variants_touch before update on public.catalog_variants
  for each row execute function private.touch_updated_at();
create trigger marketing_preferences_stamp before update on public.marketing_preferences
  for each row execute function private.stamp_marketing_choice();

-- This trigger is the only privileged auth hook. It runs in the unexposed
-- private schema, references fixed objects, and takes no user-controlled role.
create function private.on_auth_user_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_issued_at timestamptz;
begin
  if new.email is null or new.email = '' then
    return new;
  end if;
  insert into public.customer_profiles(user_id, email, email_verified_at)
  values (new.id, lower(new.email), new.email_confirmed_at)
  on conflict (user_id) do update
    set email = excluded.email,
        email_verified_at = excluded.email_verified_at
    where public.customer_profiles.email is distinct from excluded.email
       or public.customer_profiles.email_verified_at is distinct from excluded.email_verified_at;

  insert into public.marketing_preferences(user_id)
  values (new.id) on conflict (user_id) do nothing;

  -- A verified signup issues the voucher. Re-running the hook cannot reissue
  -- an expired/redeemed voucher for the same account.
  if new.email_confirmed_at is not null then
    v_issued_at := now();
    insert into public.welcome_vouchers(user_id, code, issued_at, expires_at)
    values (new.id, 'WELCOME-' || upper(replace(gen_random_uuid()::text, '-', '')),
            v_issued_at, v_issued_at + interval '2 months')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger udesign_auth_user_changed
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.on_auth_user_changed();

-- Every public table is protected by RLS, including catalog and admin roles.
alter table public.customer_profiles enable row level security;
alter table public.marketing_preferences enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.admin_members enable row level security;
alter table public.welcome_vouchers enable row level security;
alter table public.customer_orders enable row level security;
alter table public.customer_order_items enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_variants enable row level security;

create policy profiles_own_read on public.customer_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_own_update on public.customer_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy preferences_own_read on public.marketing_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy preferences_own_update on public.marketing_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy addresses_own_read on public.customer_addresses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy addresses_own_insert on public.customer_addresses for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy addresses_own_update on public.customer_addresses for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy addresses_own_delete on public.customer_addresses for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy vouchers_own_read on public.welcome_vouchers for select to authenticated
  using ((select auth.uid()) = user_id);
create policy orders_own_read on public.customer_orders for select to authenticated
  using ((select auth.uid()) = user_id);
create policy order_items_own_read on public.customer_order_items for select to authenticated
  using (exists (select 1 from public.customer_orders o
                where o.id = order_id and o.user_id = (select auth.uid())));
create policy loyalty_own_read on public.loyalty_ledger for select to authenticated
  using ((select auth.uid()) = user_id);
create policy catalog_products_public_read on public.catalog_products for select to anon, authenticated
  using (active);
create policy catalog_variants_public_read on public.catalog_variants for select to anon, authenticated
  using (available and exists (select 1 from public.catalog_products p
                              where p.id = product_id and p.active));

-- Explicit API grants are required for new Supabase projects. RLS further
-- limits rows; column grants stop clients altering protected state.
grant usage on schema public to anon, authenticated, service_role;
revoke all on public.customer_profiles, public.marketing_preferences,
  public.customer_addresses, public.admin_members, public.welcome_vouchers,
  public.customer_orders, public.customer_order_items, public.loyalty_ledger,
  public.catalog_products, public.catalog_variants from public, anon, authenticated;

grant select on public.customer_profiles, public.marketing_preferences,
  public.customer_addresses, public.welcome_vouchers, public.customer_orders,
  public.customer_order_items, public.loyalty_ledger to authenticated;
grant update (full_name, whatsapp_phone) on public.customer_profiles to authenticated;
grant update (email_opt_in, whatsapp_opt_in) on public.marketing_preferences to authenticated;
grant insert (user_id, label, recipient_name, phone, line1, line2, city,
              state, postcode, country, is_default)
  on public.customer_addresses to authenticated;
grant delete on public.customer_addresses to authenticated;
grant update (label, recipient_name, phone, line1, line2, city, state, postcode, country, is_default)
  on public.customer_addresses to authenticated;
grant select on public.catalog_products, public.catalog_variants to anon, authenticated;
grant all on public.customer_profiles, public.marketing_preferences,
  public.customer_addresses, public.admin_members, public.welcome_vouchers,
  public.customer_orders, public.customer_order_items, public.loyalty_ledger,
  public.catalog_products, public.catalog_variants to service_role;

-- This authenticated helper changes the default address in one transaction.
create function public.set_default_address(p_address_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sign in to choose a default address';
  end if;
  if not exists (select 1 from public.customer_addresses
                 where id = p_address_id and user_id = v_user_id) then
    raise exception 'Address not found';
  end if;
  -- Serialise parallel default-address requests for this account.
  perform 1 from public.customer_profiles where user_id = v_user_id for update;
  update public.customer_addresses set is_default = false
    where user_id = v_user_id and is_default;
  update public.customer_addresses set is_default = true
    where id = p_address_id and user_id = v_user_id;
end;
$$;
revoke all on function public.set_default_address(uuid) from public, anon, authenticated;
grant execute on function public.set_default_address(uuid) to authenticated;

-- No financial function is callable with a publishable key or user JWT.
-- Functions below run as service_role through a server-only PostgREST client.

create function public.checkout_prepare_order(
  p_order_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_items jsonb,
  p_shipping_sen integer,
  p_fulfilment text,
  p_region text,
  p_address text,
  p_notes text,
  p_chip_mode text,
  p_voucher_code text,
  p_redeem_points integer,
  p_email_opt_in boolean,
  p_whatsapp_opt_in boolean
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_profile_email text;
  v_item jsonb;
  v_name text;
  v_brand text;
  v_price integer;
  v_quantity integer;
  v_subtotal bigint := 0;
  v_voucher_id uuid;
  v_voucher_discount integer := 0;
  v_points integer := coalesce(p_redeem_points, 0);
  v_points_discount integer := 0;
  v_available_points bigint := 0;
  v_total integer;
begin
  if p_order_id is null or p_chip_mode is null or p_chip_mode not in ('live', 'test') then
    raise exception 'Invalid checkout request';
  end if;
  if p_chip_mode = 'test' and (p_user_id is not null or p_voucher_code is not null or v_points > 0) then
    raise exception 'Test purchases cannot use customer rewards';
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) not between 1 and 100
     or p_customer_email is null or length(trim(p_customer_email)) not between 3 and 254
     or p_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_customer_phone is null or length(trim(p_customer_phone)) not between 8 and 30
     or p_customer_phone !~ '^\+?[0-9 ()-]{8,30}$' then
    raise exception 'Invalid customer details';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid items';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Choose 1–20 items';
  end if;
  if p_shipping_sen is null or p_shipping_sen < 0 then
    raise exception 'Invalid delivery price';
  end if;
  if p_fulfilment = 'pickup' then
    if p_shipping_sen <> 0 or p_region is not null or p_address is not null then
      raise exception 'Invalid pickup details';
    end if;
  elsif p_fulfilment = 'delivery' then
    if p_region is null or p_region not in ('west', 'east', 'singapore')
       or (p_region = 'west' and p_shipping_sen <> 800)
       or (p_region = 'east' and p_shipping_sen <> 1500)
       or (p_region = 'singapore' and p_shipping_sen <> 2000)
       or p_address is null or length(trim(p_address)) not between 10 and 500 then
      raise exception 'Invalid delivery details';
    end if;
  else
    raise exception 'Choose pickup or delivery';
  end if;
  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'Notes are too long';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as t(value) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid item';
    end if;
    v_name := v_item->>'name';
    v_brand := v_item->>'brand';
    v_price := (v_item->>'price')::integer;
    v_quantity := (v_item->>'quantity')::integer;
    if v_name is null or length(v_name) not between 1 and 200
       or v_brand not in ('projects', 'moments', 'winnie')
       or v_price is null or v_price <= 0 or v_price > 1000000
       or v_quantity is null or v_quantity not between 1 and 99 then
      raise exception 'Invalid priced item';
    end if;
    v_subtotal := v_subtotal + (v_price::bigint * v_quantity);
  end loop;
  if v_subtotal < 100 or v_subtotal + p_shipping_sen > 1000000 then
    raise exception 'Order amount is unavailable online';
  end if;

  if p_user_id is not null then
    -- The account row serialises simultaneous checkouts, voucher use and
    -- point redemption. The Worker must independently verify the user JWT.
    select email into v_profile_email from public.customer_profiles
      where user_id = p_user_id and email_verified_at is not null for update;
    if not found or lower(v_profile_email) <> lower(trim(p_customer_email)) then
      raise exception 'Sign in with your account email';
    end if;
    if exists (select 1 from public.customer_orders
               where user_id = p_user_id and order_status = 'pending_payment'
                 and payment_status = 'pending') then
      raise exception 'Finish or cancel your previous checkout first';
    end if;
    update public.marketing_preferences
       set email_opt_in = coalesce(p_email_opt_in, false),
           whatsapp_opt_in = coalesce(p_whatsapp_opt_in, false)
     where user_id = p_user_id;
  elsif p_voucher_code is not null or v_points > 0 then
    raise exception 'Sign in to use your voucher or points';
  end if;

  if p_voucher_code is not null then
    if v_points <> 0 or v_subtotal < 10000 then
      raise exception 'Welcome voucher needs RM100 of products and cannot combine with points';
    end if;
    select id into v_voucher_id from public.welcome_vouchers
     where user_id = p_user_id
       and code = upper(trim(p_voucher_code))
       and expires_at > now()
       and redeemed_at is null
       and forfeited_at is null
       and reserved_order_id is null
     for update;
    if v_voucher_id is null or exists (
      select 1 from public.customer_orders
       where payment_status = 'paid'
         and (user_id = p_user_id or lower(customer_email) = lower(v_profile_email))
    ) then
      raise exception 'Welcome voucher is unavailable';
    end if;
    v_voucher_discount := 1000;
  end if;

  if v_points < 0 or v_points > 100000 then
    raise exception 'Invalid points amount';
  end if;
  if v_points > 0 then
    select coalesce(sum(points), 0) into v_available_points
      from public.loyalty_ledger where user_id = p_user_id;
    if v_points > v_available_points then
      raise exception 'Not enough available points';
    end if;
    v_points_discount := v_points * 5;
  end if;
  if v_voucher_discount + v_points_discount > v_subtotal then
    raise exception 'Discount exceeds product subtotal';
  end if;
  v_total := (v_subtotal + p_shipping_sen - v_voucher_discount - v_points_discount)::integer;
  if v_total < 100 then
    raise exception 'Online payment must be at least RM1';
  end if;

  insert into public.customer_orders(
    id, user_id, source, chip_mode, customer_name, customer_email,
    customer_phone, fulfilment, region, delivery_address, notes,
    product_subtotal_sen, shipping_sen, voucher_id, voucher_discount_sen,
    points_reserved, points_discount_sen, total_sen, payment_status,
    order_status, marketing_email_opt_in, marketing_whatsapp_opt_in)
  values (
    p_order_id, p_user_id, 'chip', p_chip_mode, trim(p_customer_name),
    lower(trim(p_customer_email)), trim(p_customer_phone), p_fulfilment,
    p_region, p_address, p_notes, v_subtotal::integer, p_shipping_sen,
    v_voucher_id, v_voucher_discount, v_points, v_points_discount, v_total,
    'pending', 'pending_payment', coalesce(p_email_opt_in, false),
    coalesce(p_whatsapp_opt_in, false));

  for v_item in select value from jsonb_array_elements(p_items) as t(value) loop
    insert into public.customer_order_items(
      order_id, product_name, brand, unit_price_sen, quantity, item_snapshot)
    values (p_order_id, v_item->>'name', v_item->>'brand',
            (v_item->>'price')::integer, (v_item->>'quantity')::integer, v_item);
  end loop;

  if v_voucher_id is not null then
    update public.welcome_vouchers
       set reserved_order_id = p_order_id, reserved_at = now()
     where id = v_voucher_id;
  end if;
  return jsonb_build_object(
    'order_id', p_order_id,
    'product_subtotal_sen', v_subtotal,
    'shipping_sen', p_shipping_sen,
    'voucher_discount_sen', v_voucher_discount,
    'points_discount_sen', v_points_discount,
    'points_reserved', v_points,
    'total_sen', v_total);
end;
$$;

create function public.checkout_attach_payment(
  p_order_id uuid, p_chip_purchase_id text
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.customer_orders%rowtype;
begin
  if p_chip_purchase_id is null or length(p_chip_purchase_id) not between 8 and 100 then
    raise exception 'Invalid CHIP purchase ID';
  end if;
  select * into v_order from public.customer_orders
    where id = p_order_id for update;
  if not found or v_order.source <> 'chip' or v_order.payment_status <> 'pending' then
    raise exception 'Pending order not found';
  end if;
  if v_order.chip_purchase_id is not null and v_order.chip_purchase_id <> p_chip_purchase_id then
    raise exception 'CHIP purchase already attached';
  end if;
  update public.customer_orders set chip_purchase_id = p_chip_purchase_id
    where id = p_order_id;
end;
$$;

create function public.checkout_release_order(p_order_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid;
  v_order public.customer_orders%rowtype;
begin
  select user_id into v_user_id from public.customer_orders where id = p_order_id;
  if not found then return; end if;
  if v_user_id is not null then
    perform 1 from public.customer_profiles where user_id = v_user_id for update;
  end if;
  select * into v_order from public.customer_orders where id = p_order_id for update;
  if v_order.payment_status = 'failed' then return; end if;
  if v_order.source <> 'chip' or v_order.payment_status <> 'pending' then
    raise exception 'Only pending CHIP orders can be released';
  end if;
  update public.customer_orders
     set payment_status = 'failed', order_status = 'cancelled'
   where id = p_order_id;
  if v_order.voucher_id is not null then
    update public.welcome_vouchers
       set reserved_order_id = null, reserved_at = null
     where id = v_order.voucher_id and reserved_order_id = p_order_id;
  end if;
  -- Points were only reserved in the pending order row, never deducted.
end;
$$;

create function public.checkout_mark_paid(
  p_order_id uuid, p_chip_purchase_id text,
  p_paid_total_sen integer, p_chip_mode text
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid;
  v_order public.customer_orders%rowtype;
begin
  select user_id into v_user_id from public.customer_orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_user_id is not null then
    perform 1 from public.customer_profiles where user_id = v_user_id for update;
  end if;
  select * into v_order from public.customer_orders where id = p_order_id for update;
  if v_order.source <> 'chip' or v_order.chip_purchase_id is distinct from p_chip_purchase_id
     or v_order.chip_mode is distinct from p_chip_mode
     or v_order.total_sen is distinct from p_paid_total_sen then
    raise exception 'Verified CHIP payment does not match the order';
  end if;
  if v_order.payment_status = 'paid' then
    return jsonb_build_object('status', 'paid', 'order_id', p_order_id);
  end if;
  if v_order.payment_status <> 'pending' then
    raise exception 'Order is not pending payment';
  end if;
  if v_order.voucher_id is not null then
    update public.welcome_vouchers
       set reserved_order_id = null, reserved_at = null,
           redeemed_order_id = p_order_id, redeemed_at = now()
     where id = v_order.voucher_id and reserved_order_id = p_order_id
       and redeemed_at is null;
    if not found then raise exception 'Voucher reservation missing'; end if;
  elsif v_user_id is not null then
    -- Any first paid order without the welcome offer ends first-order
    -- eligibility. A later full refund may restore it if appropriate.
    update public.welcome_vouchers set forfeited_at = now()
      where user_id = v_user_id and redeemed_at is null
        and forfeited_at is null and reserved_order_id is null;
  end if;
  if v_order.points_reserved > 0 and p_chip_mode = 'live' then
    insert into public.loyalty_ledger(user_id, order_id, entry_type, points)
    values (v_user_id, p_order_id, 'redeem', -v_order.points_reserved)
    on conflict (order_id, entry_type) where order_id is not null do nothing;
  end if;
  update public.customer_orders
     set payment_status = 'paid', order_status = 'placed', paid_at = now()
   where id = p_order_id;
  return jsonb_build_object('status', 'paid', 'order_id', p_order_id);
end;
$$;

create function public.checkout_mark_completed(p_order_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid;
  v_order public.customer_orders%rowtype;
  v_points integer;
begin
  select user_id into v_user_id from public.customer_orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_user_id is not null then
    perform 1 from public.customer_profiles where user_id = v_user_id for update;
  end if;
  select * into v_order from public.customer_orders where id = p_order_id for update;
  if v_order.payment_status <> 'paid' or v_order.order_status = 'cancelled'
     or (v_order.source = 'chip' and v_order.chip_mode <> 'live') then
    raise exception 'A paid live order is required';
  end if;
  v_points := floor((v_order.product_subtotal_sen - v_order.voucher_discount_sen
                     - v_order.points_discount_sen) / 100.0)::integer;
  if v_order.order_status <> 'completed' then
    update public.customer_orders
       set order_status = 'completed', completed_at = now()
     where id = p_order_id;
    if v_user_id is not null and v_points > 0 then
      insert into public.loyalty_ledger(user_id, order_id, entry_type, points)
      values (v_user_id, p_order_id, 'earn', v_points)
      on conflict (order_id, entry_type) where order_id is not null do nothing;
    end if;
  end if;
  return jsonb_build_object('status', 'completed', 'order_id', p_order_id,
                            'earned_points', case when v_user_id is null then 0 else v_points end);
end;
$$;

create function public.checkout_record_full_refund(
  p_order_id uuid, p_chip_purchase_id text
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid;
  v_order public.customer_orders%rowtype;
  v_earned integer := 0;
begin
  select user_id into v_user_id from public.customer_orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_user_id is not null then
    perform 1 from public.customer_profiles where user_id = v_user_id for update;
  end if;
  select * into v_order from public.customer_orders where id = p_order_id for update;
  if v_order.source <> 'chip' or v_order.chip_mode <> 'live'
     or v_order.chip_purchase_id is distinct from p_chip_purchase_id then
    raise exception 'Verified live CHIP purchase required';
  end if;
  if v_order.payment_status = 'refunded' then
    return jsonb_build_object('status', 'refunded', 'order_id', p_order_id);
  end if;
  if v_order.payment_status <> 'paid' then
    raise exception 'Only a paid order can be refunded';
  end if;
  if v_user_id is not null then
    select coalesce(points, 0) into v_earned from public.loyalty_ledger
      where order_id = p_order_id and entry_type = 'earn';
    if v_earned > 0 then
      insert into public.loyalty_ledger(user_id, order_id, entry_type, points)
      values (v_user_id, p_order_id, 'earn_reversal', -v_earned)
      on conflict (order_id, entry_type) where order_id is not null do nothing;
    end if;
    if v_order.points_reserved > 0 then
      insert into public.loyalty_ledger(user_id, order_id, entry_type, points)
      values (v_user_id, p_order_id, 'redeem_return', v_order.points_reserved)
      on conflict (order_id, entry_type) where order_id is not null do nothing;
    end if;
    if v_order.voucher_id is not null then
      update public.welcome_vouchers
         set redeemed_order_id = null, redeemed_at = null,
             forfeited_at = case when exists (
               select 1 from public.customer_orders
                where user_id = v_user_id and id <> p_order_id
                  and payment_status = 'paid') then now() else null end
       where id = v_order.voucher_id and redeemed_order_id = p_order_id;
    else
      update public.welcome_vouchers set forfeited_at = null
       where user_id = v_user_id and redeemed_at is null
         and not exists (select 1 from public.customer_orders
                          where user_id = v_user_id and id <> p_order_id
                            and payment_status = 'paid');
    end if;
  end if;
  update public.customer_orders
     set payment_status = 'refunded', order_status = 'cancelled', refunded_at = now()
   where id = p_order_id;
  return jsonb_build_object('status', 'refunded', 'order_id', p_order_id,
                            'reversed_points', v_earned,
                            'returned_points', v_order.points_reserved);
end;
$$;

revoke all on function public.checkout_prepare_order(
  uuid, uuid, text, text, text, jsonb, integer, text, text, text, text,
  text, text, integer, boolean, boolean) from public, anon, authenticated;
revoke all on function public.checkout_attach_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.checkout_release_order(uuid) from public, anon, authenticated;
revoke all on function public.checkout_mark_paid(uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.checkout_mark_completed(uuid) from public, anon, authenticated;
revoke all on function public.checkout_record_full_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.checkout_prepare_order(
  uuid, uuid, text, text, text, jsonb, integer, text, text, text, text,
  text, text, integer, boolean, boolean) to service_role;
grant execute on function public.checkout_attach_payment(uuid, text) to service_role;
grant execute on function public.checkout_release_order(uuid) to service_role;
grant execute on function public.checkout_mark_paid(uuid, text, integer, text) to service_role;
grant execute on function public.checkout_mark_completed(uuid) to service_role;
grant execute on function public.checkout_record_full_refund(uuid, text) to service_role;

revoke all on function private.touch_updated_at() from public, anon, authenticated;
revoke all on function private.stamp_marketing_choice() from public, anon, authenticated;
revoke all on function private.on_auth_user_changed() from public, anon, authenticated;

-- Owner-attested WhatsApp orders use the same order/loyalty tables. A manual
-- order starts unpaid. The owner marks it paid only after confirming receipt;
-- completing it is the same later action as for a CHIP order.
create function public.admin_lookup_verified_customer(p_email text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_matches integer;
  v_user_id uuid;
  v_email text;
begin
  if p_email is null or length(trim(p_email)) not between 3 and 254 then
    return null;
  end if;
  select count(*)::integer, min(user_id::text)::uuid, min(email)
    into v_matches, v_user_id, v_email
    from public.customer_profiles
   where lower(email) = lower(trim(p_email)) and email_verified_at is not null;
  if v_matches = 0 then return null; end if;
  if v_matches > 1 then raise exception 'Ambiguous customer email'; end if;
  return jsonb_build_object('user_id', v_user_id, 'email', v_email);
end;
$$;

create function public.admin_create_manual_order(
  p_order_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_items jsonb,
  p_shipping_sen integer,
  p_fulfilment text,
  p_region text,
  p_address text,
  p_notes text
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_profile_email text;
  v_item jsonb;
  v_price integer;
  v_quantity integer;
  v_subtotal bigint := 0;
  v_total integer;
begin
  if p_order_id is null or p_customer_name is null
     or length(trim(p_customer_name)) not between 1 and 100
     or p_customer_email is null
     or length(trim(p_customer_email)) not between 3 and 254
     or p_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_customer_phone is null or length(trim(p_customer_phone)) not between 8 and 30
     or p_customer_phone !~ '^\+?[0-9 ()-]{8,30}$'
     or p_items is null or jsonb_typeof(p_items) <> 'array'
     or p_shipping_sen is null or p_shipping_sen < 0 or p_shipping_sen > 1000000
     or (p_notes is not null and length(p_notes) > 500) then
    raise exception 'Invalid manual order';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Choose 1–20 items';
  end if;
  if p_fulfilment = 'pickup' then
    if p_shipping_sen <> 0 or p_region is not null or p_address is not null then
      raise exception 'Invalid pickup';
    end if;
  elsif p_fulfilment = 'delivery' then
    if p_region is null or p_region not in ('west', 'east', 'singapore')
       or p_address is null or length(trim(p_address)) not between 10 and 500 then
      raise exception 'Invalid delivery';
    end if;
  else
    raise exception 'Invalid fulfilment';
  end if;
  if p_user_id is not null then
    select email into v_profile_email from public.customer_profiles
      where user_id = p_user_id and email_verified_at is not null for update;
    if not found or lower(v_profile_email) <> lower(trim(p_customer_email)) then
      raise exception 'Account email does not match';
    end if;
  end if;
  for v_item in select value from jsonb_array_elements(p_items) as t(value) loop
    if jsonb_typeof(v_item) <> 'object'
       or length(coalesce(v_item->>'name', '')) not between 1 and 200
       or v_item->>'brand' not in ('projects', 'moments', 'winnie') then
      raise exception 'Invalid manual item';
    end if;
    v_price := (v_item->>'price')::integer;
    v_quantity := (v_item->>'quantity')::integer;
    if v_price is null or v_price <= 0 or v_price > 1000000
       or v_quantity is null or v_quantity not between 1 and 99 then
      raise exception 'Invalid manual price or quantity';
    end if;
    v_subtotal := v_subtotal + v_price::bigint * v_quantity;
  end loop;
  if v_subtotal <= 0 or v_subtotal + p_shipping_sen > 1000000 then
    raise exception 'Manual order amount is too high';
  end if;
  v_total := (v_subtotal + p_shipping_sen)::integer;
  insert into public.customer_orders(
    id, user_id, source, customer_name, customer_email, customer_phone,
    fulfilment, region, delivery_address, notes, product_subtotal_sen,
    shipping_sen, total_sen, payment_status, order_status)
  values (p_order_id, p_user_id, 'manual', trim(p_customer_name),
          lower(trim(p_customer_email)), trim(p_customer_phone), p_fulfilment,
          p_region, p_address, p_notes, v_subtotal::integer,
          p_shipping_sen, v_total, 'manual_unpaid', 'placed');
  for v_item in select value from jsonb_array_elements(p_items) as t(value) loop
    insert into public.customer_order_items(
      order_id, product_name, brand, unit_price_sen, quantity, item_snapshot)
    values (p_order_id, v_item->>'name', v_item->>'brand',
            (v_item->>'price')::integer, (v_item->>'quantity')::integer, v_item);
  end loop;
  return jsonb_build_object('order_id', p_order_id, 'total_sen', v_total,
                            'status', 'manual_unpaid');
end;
$$;

create function public.admin_mark_manual_paid(p_order_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid;
  v_order public.customer_orders%rowtype;
begin
  select user_id into v_user_id from public.customer_orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_user_id is not null then
    perform 1 from public.customer_profiles where user_id = v_user_id for update;
  end if;
  select * into v_order from public.customer_orders where id = p_order_id for update;
  if v_order.source <> 'manual' then raise exception 'Not a manual order'; end if;
  if v_order.payment_status = 'paid' then
    return jsonb_build_object('order_id', p_order_id, 'status', 'paid');
  end if;
  if v_order.payment_status <> 'manual_unpaid' then
    raise exception 'Manual order is not awaiting payment';
  end if;
  if v_user_id is not null then
    if exists (select 1 from public.customer_orders
               where user_id = v_user_id and id <> p_order_id
                 and payment_status = 'pending'
                 and order_status = 'pending_payment') then
      raise exception 'Resolve the account checkout before recording manual payment';
    end if;
    update public.welcome_vouchers set forfeited_at = now()
      where user_id = v_user_id and redeemed_at is null
        and forfeited_at is null and reserved_order_id is null;
  end if;
  update public.customer_orders set payment_status = 'paid', paid_at = now()
    where id = p_order_id;
  return jsonb_build_object('order_id', p_order_id, 'status', 'paid');
end;
$$;

create function public.admin_record_manual_full_refund(p_order_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid;
  v_order public.customer_orders%rowtype;
  v_earned integer := 0;
begin
  select user_id into v_user_id from public.customer_orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_user_id is not null then
    perform 1 from public.customer_profiles where user_id = v_user_id for update;
  end if;
  select * into v_order from public.customer_orders where id = p_order_id for update;
  if v_order.source <> 'manual' then raise exception 'Not a manual order'; end if;
  if v_order.payment_status = 'refunded' then
    return jsonb_build_object('order_id', p_order_id, 'status', 'refunded');
  end if;
  if v_order.payment_status <> 'paid' then
    raise exception 'Only a paid order can be refunded';
  end if;
  if v_user_id is not null then
    select coalesce(points, 0) into v_earned from public.loyalty_ledger
      where order_id = p_order_id and entry_type = 'earn';
    if v_earned > 0 then
      insert into public.loyalty_ledger(user_id, order_id, entry_type, points)
      values (v_user_id, p_order_id, 'earn_reversal', -v_earned)
      on conflict (order_id, entry_type) where order_id is not null do nothing;
    end if;
    update public.welcome_vouchers set forfeited_at = null
     where user_id = v_user_id and redeemed_at is null
       and not exists (select 1 from public.customer_orders
                        where user_id = v_user_id and id <> p_order_id
                          and payment_status = 'paid');
  end if;
  update public.customer_orders
     set payment_status = 'refunded', order_status = 'cancelled', refunded_at = now()
   where id = p_order_id;
  return jsonb_build_object('order_id', p_order_id, 'status', 'refunded',
                            'reversed_points', v_earned);
end;
$$;

revoke all on function public.admin_lookup_verified_customer(text)
  from public, anon, authenticated;
revoke all on function public.admin_create_manual_order(
  uuid, uuid, text, text, text, jsonb, integer, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_mark_manual_paid(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_record_manual_full_refund(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_lookup_verified_customer(text) to service_role;
grant execute on function public.admin_create_manual_order(
  uuid, uuid, text, text, text, jsonb, integer, text, text, text, text)
  to service_role;
grant execute on function public.admin_mark_manual_paid(uuid) to service_role;
grant execute on function public.admin_record_manual_full_refund(uuid) to service_role;
