-- =============================================================
-- 20260323000000_product_stock_integrity.sql
-- 옵션이 있는 상품의 products.stock 정합성 강화 및 어드민 목록 뷰 추가
-- =============================================================

-- 1) 레거시 데이터 정리
-- 옵션이 존재하는 상품의 products.stock을 NULL로 초기화
UPDATE public.products p
SET stock = NULL
WHERE p.stock IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_options po WHERE po.product_id = p.id);

-- 2) replace_product_options RPC 강화 (defense-in-depth)
-- 옵션 INSERT 시 해당 상품의 products.stock도 NULL로 강제 설정
CREATE OR REPLACE FUNCTION public.replace_product_options(
  p_product_id integer,
  p_options     jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can modify products';
  END IF;

  DELETE FROM public.product_options
  WHERE product_id = p_product_id;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'p_options must be a JSON array';
  END IF;

  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO public.product_options
      (product_id, name, additional_price, stock)
    SELECT
      p_product_id,
      (elem->>'name')::varchar(255),
      (elem->>'additional_price')::integer,
      CASE WHEN elem->>'stock' IS NULL THEN NULL
           ELSE (elem->>'stock')::integer END
    FROM jsonb_array_elements(p_options) AS elem;

    -- 옵션이 1개 이상이면 products.stock을 NULL로 강제
    UPDATE public.products
    SET stock = NULL
    WHERE id = p_product_id AND stock IS NOT NULL;
  END IF;
END;
$$;

-- 3) 어드민 전용 상품 목록 뷰
-- stock: products.stock 그대로 (옵션 있으면 NULL)
-- option_stock_total: 옵션 재고 합계. 옵션 중 하나라도 NULL(무제한)이면 전체 NULL
-- option_count: 옵션 개수 (0이면 옵션 없는 상품)
CREATE OR REPLACE VIEW public.admin_product_list_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.code,
  p.name,
  p.price,
  p.image,
  p.category,
  p.color,
  p.material,
  p.stock,
  p.created_at,
  p.updated_at,
  COUNT(po.id)::integer AS option_count,
  CASE
    WHEN COUNT(po.id) = 0 THEN NULL
    WHEN bool_or(po.stock IS NULL) THEN NULL
    ELSE SUM(po.stock)::integer
  END AS option_stock_total
FROM public.products p
LEFT JOIN public.product_options po ON po.product_id = p.id
GROUP BY
  p.id, p.code, p.name, p.price, p.image,
  p.category, p.color, p.material, p.stock,
  p.created_at, p.updated_at;
