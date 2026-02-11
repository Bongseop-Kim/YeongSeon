create or replace function public.product_is_liked_rpc(p_id integer)
returns boolean
language sql
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.product_likes pl
    where pl.product_id = p_id
      and pl.user_id = auth.uid()
  );
$function$;

revoke all on function public.product_is_liked_rpc(integer) from public;
grant execute on function public.product_is_liked_rpc(integer) to anon;
grant execute on function public.product_is_liked_rpc(integer) to authenticated;
grant execute on function public.product_is_liked_rpc(integer) to service_role;

create or replace view public.product_list_view
with (security_invoker = true) as
select
  p.id,
  p.code,
  p.name,
  p.price,
  p.image,
  p.detail_images as "detailImages",
  p.category,
  p.color,
  p.pattern,
  p.material,
  p.info,
  p.created_at,
  p.updated_at,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', po.option_id,
        'name', po.name,
        'additionalPrice', po.additional_price
      )
      order by po.option_id
    ) filter (where po.id is not null),
    '[]'::jsonb
  ) as options,
  coalesce(lc.likes, 0) as likes,
  coalesce(public.product_is_liked_rpc(p.id), false) as "isLiked"
from public.products p
left join public.product_options po
  on po.product_id = p.id
left join public.product_like_counts_rpc() lc
  on lc.product_id = p.id
group by
  p.id,
  p.code,
  p.name,
  p.price,
  p.image,
  p.detail_images,
  p.category,
  p.color,
  p.pattern,
  p.material,
  p.info,
  p.created_at,
  p.updated_at,
  lc.likes;

create or replace function public.get_products_by_ids(p_ids integer[])
returns table(
  id integer,
  code character varying,
  name character varying,
  price integer,
  image text,
  "detailImages" text[],
  category character varying,
  color character varying,
  pattern character varying,
  material character varying,
  info text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  options jsonb,
  likes integer,
  "isLiked" boolean
)
language sql
stable
set search_path = public
as $function$
  select
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images as "detailImages",
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.option_id,
          'name', po.name,
          'additionalPrice', po.additional_price
        )
        order by po.option_id
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(lc.likes, 0) as likes,
    coalesce(public.product_is_liked_rpc(p.id), false) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join product_like_counts_rpc() lc on lc.product_id = p.id
  where p.id = any (p_ids)
  group by
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images,
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    lc.likes
  order by p.id;
$function$;
