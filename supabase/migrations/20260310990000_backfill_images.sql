-- =============================================================
-- 기존 이미지 데이터 → images 테이블 백필
-- file_id는 레거시 데이터이므로 NULL로 삽입
-- =============================================================

-- products 대표 이미지
INSERT INTO public.images (url, folder, entity_type, entity_id)
SELECT image, '/products', 'product', id::text
FROM public.products
WHERE image IS NOT NULL;

-- products 상세 이미지
INSERT INTO public.images (url, folder, entity_type, entity_id)
SELECT unnest(detail_images), '/products', 'product', id::text
FROM public.products
WHERE detail_images IS NOT NULL AND array_length(detail_images, 1) > 0;

-- quote_requests 참조 이미지 (jsonb 배열, { url, fileId? } 구조)
INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
SELECT
  elem->>'url',
  nullif(elem->>'fileId', ''),
  '/custom-orders',
  'quote_request',
  qr.id::text,
  qr.user_id
FROM public.quote_requests qr,
     jsonb_array_elements(qr.reference_images) AS elem
WHERE qr.reference_images IS NOT NULL
  AND jsonb_array_length(qr.reference_images) > 0
  AND elem->>'url' IS NOT NULL;
