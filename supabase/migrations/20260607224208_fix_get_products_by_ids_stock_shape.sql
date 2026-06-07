DROP FUNCTION IF EXISTS public.get_products_by_ids(integer[]);

CREATE OR REPLACE FUNCTION public.get_products_by_ids(p_ids integer[])
RETURNS TABLE (
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
  stock integer,
  "optionLabel" character varying,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  options jsonb,
  likes integer,
  "isLiked" boolean
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
    p.stock,
    p.option_label as "optionLabel",
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.id::text,
          'name', po.name,
          'additionalPrice', po.additional_price,
          'stock', po.stock
        )
        order by po.id
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(lc.likes, 0) as likes,
    coalesce(public.product_is_liked_rpc(p.id), false) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join public.product_like_counts lc on lc.product_id = p.id
  where p.id = any (p_ids)
  group by
    p.id, p.code, p.name, p.price, p.image, p.detail_images,
    p.category, p.color, p.pattern, p.material, p.info,
    p.stock, p.option_label, p.created_at, p.updated_at, lc.likes
  order by p.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_products_by_ids(integer[]) TO anon, authenticated, service_role;
