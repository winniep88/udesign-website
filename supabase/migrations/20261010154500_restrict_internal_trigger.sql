-- Supabase's automatic RLS event trigger is internal; browser roles must not
-- have the default PUBLIC execute grant on its SECURITY DEFINER function.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

create index admin_members_granted_by_idx on public.admin_members(granted_by);
create index customer_orders_voucher_idx on public.customer_orders(voucher_id);
