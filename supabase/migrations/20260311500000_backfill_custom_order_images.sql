-- =============================================================
-- 20260311500000_backfill_custom_order_images.sql
-- 기존 custom_order 데이터의 참조 이미지를 images 테이블에 백필
-- (Step 1-A 마이그레이션 이후 실행)
-- =============================================================

INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
SELECT
  elem->>'url',
  nullif(elem->>'file_id', ''),
  '/custom-orders',
  'custom_order',
  o.id::text,
  o.user_id
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id AND oi.item_type = 'custom'
, jsonb_array_elements(oi.item_data->'reference_images') AS elem
WHERE o.order_type = 'custom'
  AND oi.item_data->'reference_images' IS NOT NULL
  AND jsonb_array_length(oi.item_data->'reference_images') > 0
  AND elem->>'url' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.images img
    WHERE img.entity_type = 'custom_order'
      AND img.entity_id = o.id::text
      AND img.url = elem->>'url'
  );

-- 이미 완료/취소된 주문의 이미지에 만료 설정
UPDATE public.images i
SET expires_at = now() + interval '90 days'
FROM public.orders o
WHERE i.entity_type = 'custom_order'
  AND i.entity_id = o.id::text
  AND o.status IN ('완료', '취소')
  AND i.expires_at IS NULL
  AND i.deleted_at IS NULL;
