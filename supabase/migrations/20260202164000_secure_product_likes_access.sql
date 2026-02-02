drop policy if exists "Anyone can view like counts" on public.product_likes;

revoke select on table public.product_likes from public;
revoke select on table public.product_likes from anon;
revoke select on table public.product_likes from authenticated;

create or replace function public.product_like_counts_rpc()
returns table(product_id integer, likes integer)
language sql
security definer
set search_path = public
as $function$
  select
    pl.product_id,
    count(*)::int as likes
  from public.product_likes pl
  group by pl.product_id;
$function$;

revoke all on function public.product_like_counts_rpc() from public;
grant execute on function public.product_like_counts_rpc() to anon;
grant execute on function public.product_like_counts_rpc() to authenticated;
grant execute on function public.product_like_counts_rpc() to service_role;

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
  coalesce(
    exists (
      select 1
      from public.product_likes pl
      where pl.product_id = p.id
        and pl.user_id = auth.uid()
    ),
    false
  ) as "isLiked"
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

create or replace function public.get_product_by_id(p_id integer)
returns jsonb
language sql
stable
set search_path = public
as $function$
  select to_jsonb(row_data)
  from (
    select
      p.id,
      p.code,
      p.name,
      p.price,
      p.image,
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
      exists (
        select 1
        from product_likes pl
        where pl.product_id = p.id
          and pl.user_id = auth.uid()
      ) as "isLiked"
    from products p
    left join product_options po on po.product_id = p.id
    left join product_like_counts_rpc() lc on lc.product_id = p.id
    where p.id = p_id
    group by
      p.id,
      p.code,
      p.name,
      p.price,
      p.image,
      p.category,
      p.color,
      p.pattern,
      p.material,
      p.info,
      p.created_at,
      p.updated_at,
      lc.likes
  ) row_data;
$function$;

create or replace function public.get_products(
  p_categories text[] default null::text[],
  p_colors text[] default null::text[],
  p_patterns text[] default null::text[],
  p_materials text[] default null::text[],
  p_price_min integer default null::integer,
  p_price_max integer default null::integer,
  p_sort_option text default 'latest'::text
)
returns table(
  id integer,
  code character varying,
  name character varying,
  price integer,
  image text,
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
    exists (
      select 1
      from product_likes pl
      where pl.product_id = p.id
        and pl.user_id = auth.uid()
    ) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join product_like_counts_rpc() lc on lc.product_id = p.id
  where
    (p_categories is null or array_length(p_categories, 1) = 0 or p.category = any (p_categories))
    and (p_colors is null or array_length(p_colors, 1) = 0 or p.color = any (p_colors))
    and (p_patterns is null or array_length(p_patterns, 1) = 0 or p.pattern = any (p_patterns))
    and (p_materials is null or array_length(p_materials, 1) = 0 or p.material = any (p_materials))
    and (p_price_min is null or p.price >= p_price_min)
    and (p_price_max is null or p.price <= p_price_max)
  group by
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    lc.likes
  order by
    case when p_sort_option = 'latest' then p.id end desc,
    case when p_sort_option = 'price-low' then p.price end asc,
    case when p_sort_option = 'price-high' then p.price end desc,
    case when p_sort_option = 'popular' then coalesce(lc.likes, 0) end desc,
    p.id desc;
$function$;

create or replace function public.get_products_by_ids(p_ids integer[])
returns table(
  id integer,
  code character varying,
  name character varying,
  price integer,
  image text,
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
    exists (
      select 1
      from product_likes pl
      where pl.product_id = p.id
        and pl.user_id = auth.uid()
    ) as "isLiked"
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
