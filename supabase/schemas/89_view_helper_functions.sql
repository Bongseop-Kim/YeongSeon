-- =============================================================
-- 89_view_helper_functions.sql  –  Helper functions used by views
-- =============================================================

-- Aggregates like counts per product (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.product_like_counts_rpc()
RETURNS TABLE (product_id integer, likes integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    pl.product_id,
    count(*)::int as likes
  from public.product_likes pl
  group by pl.product_id;
$$;

-- Checks if the current user liked a product (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.product_is_liked_rpc(p_id integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1
    from public.product_likes pl
    where pl.product_id = p_id
      and pl.user_id = auth.uid()
  );
$$;

-- Returns products with options, likes, isLiked by id array
CREATE OR REPLACE FUNCTION public.get_products_by_ids(p_ids integer[])
RETURNS TABLE (
  id            integer,
  code          character varying,
  name          character varying,
  price         integer,
  image         text,
  "detailImages" text[],
  category      character varying,
  color         character varying,
  pattern       character varying,
  material      character varying,
  info          text,
  created_at    timestamp with time zone,
  updated_at    timestamp with time zone,
  options       jsonb,
  likes         integer,
  "isLiked"     boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
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
    p.id, p.code, p.name, p.price, p.image, p.detail_images,
    p.category, p.color, p.pattern, p.material, p.info,
    p.created_at, p.updated_at, lc.likes
  order by p.id;
$$;
