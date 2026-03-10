-- =============================================================
-- 88_images.sql  –  Central image management table
-- =============================================================

CREATE TABLE public.images (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url         text        NOT NULL,
  file_id     text,                          -- ImageKit fileId (null = 레거시)
  folder      text        NOT NULL,          -- '/products', '/custom-orders', '/reform'
  entity_type text        NOT NULL,          -- 'product', 'custom_order', 'quote_request', 'reform'
  entity_id   text        NOT NULL,          -- 연결된 엔티티 ID
  uploaded_by uuid        REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  expires_at  timestamptz,                   -- null = 영구 보관
  deleted_at  timestamptz,                   -- soft delete (ImageKit 삭제 완료 시각)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_images_entity ON public.images (entity_type, entity_id);
CREATE INDEX idx_images_expires ON public.images (expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_images_file_id ON public.images (file_id) WHERE file_id IS NOT NULL;

-- RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- 자신이 업로드한 이미지 조회
CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- 상품 이미지 공개 조회
CREATE POLICY "Public product images" ON public.images
  FOR SELECT USING (entity_type = 'product');

-- Admin 전체 접근 (is_admin() 함수 활용)
CREATE POLICY "Admin full access" ON public.images
  FOR ALL TO authenticated
  USING (public.is_admin());

-- RPC: register_image
-- 업로드 성공 후 images 테이블에 레코드를 등록한다.
-- entity_id가 확정된 시점(엔티티 저장 RPC)에서 호출하는 것을 권장하며,
-- 프론트엔드에서 직접 호출할 때는 엔티티 저장 전 임시 entity_id를 사용할 수 없으므로
-- 엔티티 저장 RPC 내부에서 호출하는 방법(방법 A)을 우선 사용한다.
CREATE OR REPLACE FUNCTION public.register_image(
  p_url         text,
  p_file_id     text,
  p_folder      text,
  p_entity_type text,
  p_entity_id   text,
  p_expires_at  timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- SECURITY INVOKER keeps the caller's auth context, so auth.uid() here is the
  -- authenticated caller identity. We verify entity ownership explicitly before
  -- the INSERT, and let the INSERT RLS policy enforce uploaded_by = auth.uid().
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_entity_type = 'product' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'quote_request' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.quote_requests qr
      WHERE qr.id::text = p_entity_id
        AND qr.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'custom_order' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'custom'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'reform' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'repair'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END IF;

  INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at)
  VALUES (p_url, p_file_id, p_folder, p_entity_type, p_entity_id, v_user_id, p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_image(text, text, text, text, text, timestamptz) TO authenticated;

-- 만료 정책 (참고용 주석)
-- | entity_type   | expires_at 설정 시점           | 기간  |
-- |---------------|-------------------------------|-------|
-- | product       | 설정 안 함 (영구)              | -     |
-- | custom_order  | 주문 완료/취소 시 트리거       | +90일 |
-- | quote_request | 견적 종료 시 트리거            | +90일 |
-- | reform        | 주문 완료/취소 시 트리거       | +90일 |
