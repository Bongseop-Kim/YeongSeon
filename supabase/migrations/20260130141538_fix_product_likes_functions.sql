create or replace function public.increment_product_likes(product_id integer)
returns void
language plpgsql
as $function$
begin
  -- Likes are derived from product_likes aggregation; keep for compatibility.
  return;
end;
$function$;

create or replace function public.decrement_product_likes(product_id integer)
returns void
language plpgsql
as $function$
begin
  -- Likes are derived from product_likes aggregation; keep for compatibility.
  return;
end;
$function$;
