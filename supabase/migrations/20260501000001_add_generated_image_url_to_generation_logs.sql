-- ai_generation_logs에 생성된 이미지 URL 컬럼 추가
-- 이미지 생성 후 프론트에서 ImageKit 업로드 완료 시 set_generation_log_image_url RPC로 기록

ALTER TABLE public.ai_generation_logs
  ADD COLUMN generated_image_url text;

-- ═══════════════════════════════════════════════════════
-- 1. 이미지 URL 업데이트 RPC (프론트엔드용)
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_generation_log_image_url(
  p_work_id   text,
  p_image_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.ai_generation_logs
  SET generated_image_url = p_image_url
  WHERE work_id = p_work_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_generation_log_image_url(text, text) TO authenticated;

-- ═══════════════════════════════════════════════════════
-- 2. admin_get_generation_logs: generated_image_url 포함하도록 업데이트
-- ═══════════════════════════════════════════════════════

-- RETURNS TABLE 변경은 CREATE OR REPLACE 불가 → DROP 후 재생성
DROP FUNCTION IF EXISTS public.admin_get_generation_logs(date, date, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_generation_logs(
  p_start_date date,
  p_end_date   date,
  p_ai_model   text    DEFAULT NULL,
  p_limit      integer DEFAULT 50,
  p_offset     integer DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  work_id             text,
  user_id             uuid,
  ai_model            text,
  request_type        text,
  quality             text,
  user_message        text,
  prompt_length       integer,
  design_context      jsonb,
  conversation_turn   integer,
  has_ci_image        boolean,
  has_reference_image boolean,
  has_previous_image  boolean,
  ai_message          text,
  generate_image      boolean,
  image_generated     boolean,
  generated_image_url text,
  detected_design     jsonb,
  tokens_charged      integer,
  tokens_refunded     integer,
  text_latency_ms     integer,
  image_latency_ms    integer,
  total_latency_ms    integer,
  error_type          text,
  created_at          timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date and p_end_date are required';
  END IF;

  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'p_start_date must be <= p_end_date';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 200';
  END IF;

  IF p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'p_offset must be >= 0';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.work_id,
    l.user_id,
    l.ai_model,
    l.request_type,
    l.quality,
    l.user_message,
    l.prompt_length,
    l.design_context,
    l.conversation_turn,
    l.has_ci_image,
    l.has_reference_image,
    l.has_previous_image,
    l.ai_message,
    l.generate_image,
    l.image_generated,
    l.generated_image_url,
    l.detected_design,
    l.tokens_charged,
    l.tokens_refunded,
    l.text_latency_ms,
    l.image_latency_ms,
    l.total_latency_ms,
    l.error_type,
    l.created_at
  FROM public.ai_generation_logs l
  WHERE l.created_at >= p_start_date
    AND l.created_at < p_end_date + 1
    AND (p_ai_model IS NULL OR l.ai_model = p_ai_model)
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
