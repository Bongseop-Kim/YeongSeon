drop function if exists public.get_orders();

drop function if exists public.get_order(uuid);

drop function if exists public.get_product_by_id(integer);

drop function if exists public.get_products(
  text[],
  text[],
  text[],
  text[],
  integer,
  integer,
  text
);
