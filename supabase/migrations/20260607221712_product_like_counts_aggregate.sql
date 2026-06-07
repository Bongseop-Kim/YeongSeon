CREATE TABLE IF NOT EXISTS public.product_like_counts (
  product_id integer PRIMARY KEY REFERENCES public.products (id) ON DELETE CASCADE,
  likes integer NOT NULL DEFAULT 0 CHECK (likes >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.product_like_counts (product_id, likes)
SELECT product_id, count(*)::integer
FROM public.product_likes
GROUP BY product_id
ON CONFLICT (product_id) DO UPDATE
SET likes = EXCLUDED.likes,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.sync_product_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_like_counts (product_id, likes)
    VALUES (NEW.product_id, 1)
    ON CONFLICT (product_id) DO UPDATE
    SET likes = public.product_like_counts.likes + 1,
        updated_at = now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.product_like_counts
    SET likes = greatest(likes - 1, 0),
        updated_at = now()
    WHERE product_id = OLD.product_id;

    DELETE FROM public.product_like_counts
    WHERE product_id = OLD.product_id
      AND likes = 0;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    UPDATE public.product_like_counts
    SET likes = greatest(likes - 1, 0),
        updated_at = now()
    WHERE product_id = OLD.product_id;

    DELETE FROM public.product_like_counts
    WHERE product_id = OLD.product_id
      AND likes = 0;

    INSERT INTO public.product_like_counts (product_id, likes)
    VALUES (NEW.product_id, 1)
    ON CONFLICT (product_id) DO UPDATE
    SET likes = public.product_like_counts.likes + 1,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_product_like_counts()
  IS 'SECURITY DEFINER is required for product_likes triggers to maintain the public aggregate table without granting direct write access to clients.';

DROP TRIGGER IF EXISTS sync_product_like_counts_trigger ON public.product_likes;
CREATE TRIGGER sync_product_like_counts_trigger
AFTER INSERT OR DELETE OR UPDATE OF product_id ON public.product_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_product_like_counts();

ALTER TABLE public.product_like_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view product like counts"
  ON public.product_like_counts;

CREATE POLICY "Public can view product like counts"
  ON public.product_like_counts FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.product_like_counts
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.product_like_counts
  TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_product_like_counts()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.product_list_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.code,
  p.name,
  p.price,
  p.image,
  p.detail_images AS "detailImages",
  p.category,
  p.color,
  p.pattern,
  p.material,
  p.info,
  p.stock,
  p.option_label AS "optionLabel",
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
  ) AS options,
  coalesce(lc.likes, 0) AS likes,
  coalesce(public.product_is_liked_rpc(p.id), false) AS "isLiked"
FROM public.products p
LEFT JOIN public.product_options po ON po.product_id = p.id
LEFT JOIN public.product_like_counts lc ON lc.product_id = p.id
GROUP BY
  p.id, p.code, p.name, p.price, p.image, p.detail_images,
  p.category, p.color, p.pattern, p.material, p.info,
  p.stock, p.option_label, p.created_at, p.updated_at, lc.likes;

GRANT SELECT ON public.product_list_view TO anon, authenticated, service_role;

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
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.id::text,
          'name', po.name,
          'additionalPrice', po.additional_price
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
    p.created_at, p.updated_at, lc.likes
  order by p.id;
$$;

DROP FUNCTION IF EXISTS public.product_like_counts_rpc();
