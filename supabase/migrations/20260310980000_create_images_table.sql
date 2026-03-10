-- =============================================================
-- images 테이블 생성 + RLS + register_image RPC
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

CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Public product images" ON public.images
  FOR SELECT USING (entity_type = 'product');

CREATE POLICY "Admin full access" ON public.images
  FOR ALL TO authenticated
  USING (public.is_admin());

-- RPC: register_image
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
BEGIN
  INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at)
  VALUES (p_url, p_file_id, p_folder, p_entity_type, p_entity_id, auth.uid(), p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_image(text, text, text, text, text, timestamptz) TO authenticated;
