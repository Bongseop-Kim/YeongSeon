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
left join (
  select product_id, count(*)::int as likes
  from public.product_likes
  group by product_id
) lc
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
