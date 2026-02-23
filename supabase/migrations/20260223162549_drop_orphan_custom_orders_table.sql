do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'custom_orders'
  ) then
    drop policy if exists "select own custom orders" on public.custom_orders;
    drop table public.custom_orders;
  end if;
end $$;

drop function if exists public.generate_custom_order_number();
