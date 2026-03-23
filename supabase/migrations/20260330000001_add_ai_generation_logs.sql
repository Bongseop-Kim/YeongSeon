-- supabase/migrations/20260329000000_add_ai_generation_logs.sql
-- AI 생성 로그 테이블 + 관리자 통계/조회 RPC

-- ═══════════════════════════════════════════════════════
-- 1. 테이블
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.ai_generation_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id             text        NOT NULL UNIQUE,  -- design_tokens.work_id 와 1:1 조인 키
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 요청 메타데이터
  ai_model            text        NOT NULL CHECK (ai_model IN ('openai', 'gemini')),
  request_type        text        CHECK (request_type IN ('text_only', 'text_and_image')),  -- nullable: text API 실패 시 미결정
  quality             text        CHECK (quality IN ('standard', 'high')),

  -- 프롬프트 / 입력 분석
  user_message        text        NOT NULL,
  prompt_length       integer     NOT NULL,
  design_context      jsonb,                           -- { colors, pattern, fabricMethod, ciPlacement, scale }
  conversation_turn   integer     NOT NULL DEFAULT 0,
  has_ci_image        boolean     NOT NULL DEFAULT false,
  has_reference_image boolean     NOT NULL DEFAULT false,
  has_previous_image  boolean     NOT NULL DEFAULT false,

  -- 출력 결과
  ai_message          text,
  generate_image      boolean,
  image_generated     boolean     NOT NULL DEFAULT false,
  detected_design     jsonb,

  -- 토큰
  tokens_charged      integer     NOT NULL DEFAULT 0,
  tokens_refunded     integer     NOT NULL DEFAULT 0,

  -- 성능 메트릭
  text_latency_ms     integer,
  image_latency_ms    integer,
  total_latency_ms    integer,

  -- 에러
  error_type          text,
  error_message       text,

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_gen_logs_user    ON public.ai_generation_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_gen_logs_model   ON public.ai_generation_logs (ai_model, created_at DESC);
CREATE INDEX idx_ai_gen_logs_created ON public.ai_generation_logs (created_at DESC);

-- ═══════════════════════════════════════════════════════
-- 2. RLS
-- ═══════════════════════════════════════════════════════

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════
-- 3. RPC: admin_get_generation_stats
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_get_generation_stats(
  p_start_date date,
  p_end_date   date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_summary        jsonb;
  v_by_model       jsonb;
  v_by_pattern     jsonb;
  v_by_input_type  jsonb;
  v_by_error       jsonb;
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

  -- 요약 통계
  SELECT jsonb_build_object(
    'total_requests',        COUNT(*)::bigint,
    'image_success_rate',    ROUND(
                               CASE WHEN COUNT(*) FILTER (WHERE generate_image = true) > 0
                                 THEN COUNT(*) FILTER (WHERE image_generated = true)::numeric
                                    / COUNT(*) FILTER (WHERE generate_image = true) * 100
                               ELSE 0
                               END, 1
                             ),
    'total_tokens_consumed', COALESCE(SUM(tokens_charged - tokens_refunded), 0)::bigint,
    'avg_total_latency_ms',  ROUND(COALESCE(AVG(total_latency_ms), 0))::bigint
  )
  INTO v_summary
  FROM public.ai_generation_logs
  WHERE created_at >= p_start_date
    AND created_at <  p_end_date + 1;

  -- 모델별 통계
  SELECT COALESCE(jsonb_agg(row ORDER BY request_count DESC), '[]'::jsonb)
  INTO v_by_model
  FROM (
    SELECT jsonb_build_object(
      'ai_model',            ai_model,
      'request_count',       COUNT(*)::bigint,
      'avg_text_latency_ms', ROUND(COALESCE(AVG(text_latency_ms), 0))::bigint,
      'avg_image_latency_ms',ROUND(COALESCE(AVG(image_latency_ms) FILTER (WHERE image_latency_ms IS NOT NULL), 0))::bigint,
      'avg_token_cost',      ROUND(COALESCE(AVG(tokens_charged - tokens_refunded), 0), 1),
      'image_success_rate',  ROUND(
                               CASE WHEN COUNT(*) FILTER (WHERE generate_image = true) > 0
                                 THEN COUNT(*) FILTER (WHERE image_generated = true)::numeric
                                    / COUNT(*) FILTER (WHERE generate_image = true) * 100
                               ELSE 0
                               END, 1
                             )
    ) AS row,
    COUNT(*) AS request_count
    FROM public.ai_generation_logs
    WHERE created_at >= p_start_date
      AND created_at <  p_end_date + 1
    GROUP BY ai_model
  ) sub;

  -- 패턴별 통계 (designContext.pattern 기준)
  SELECT COALESCE(jsonb_agg(row ORDER BY request_count DESC), '[]'::jsonb)
  INTO v_by_pattern
  FROM (
    SELECT jsonb_build_object(
      'pattern',            COALESCE(design_context->>'pattern', '(미지정)'),
      'request_count',      COUNT(*)::bigint,
      'image_success_rate', ROUND(
                              CASE WHEN COUNT(*) FILTER (WHERE generate_image = true) > 0
                                THEN COUNT(*) FILTER (WHERE image_generated = true)::numeric
                                   / COUNT(*) FILTER (WHERE generate_image = true) * 100
                              ELSE 0
                              END, 1
                            ),
      'avg_token_cost',     ROUND(COALESCE(AVG(tokens_charged - tokens_refunded), 0), 1)
    ) AS row,
    COUNT(*) AS request_count
    FROM public.ai_generation_logs
    WHERE created_at >= p_start_date
      AND created_at <  p_end_date + 1
    GROUP BY design_context->>'pattern'
    ORDER BY COUNT(*) DESC
    LIMIT 20
  ) sub;

  -- 입력 이미지 유형별 통계
  SELECT COALESCE(jsonb_agg(row ORDER BY request_count DESC), '[]'::jsonb)
  INTO v_by_input_type
  FROM (
    SELECT jsonb_build_object(
      'input_type',         CASE
                              WHEN has_previous_image                         THEN '편집(이전 이미지)'
                              WHEN has_ci_image AND has_reference_image       THEN 'CI + 레퍼런스'
                              WHEN has_ci_image                               THEN 'CI만'
                              WHEN has_reference_image                        THEN '레퍼런스만'
                              ELSE '텍스트만'
                            END,
      'request_count',      COUNT(*)::bigint,
      'image_success_rate', ROUND(
                              CASE WHEN COUNT(*) FILTER (WHERE generate_image = true) > 0
                                THEN COUNT(*) FILTER (WHERE image_generated = true)::numeric
                                   / COUNT(*) FILTER (WHERE generate_image = true) * 100
                              ELSE 0
                              END, 1
                            ),
      'avg_latency_ms',     ROUND(COALESCE(AVG(total_latency_ms), 0))::bigint,
      'avg_token_cost',     ROUND(COALESCE(AVG(tokens_charged - tokens_refunded), 0), 1)
    ) AS row,
    COUNT(*) AS request_count
    FROM public.ai_generation_logs
    WHERE created_at >= p_start_date
      AND created_at <  p_end_date + 1
    GROUP BY
      has_previous_image,
      has_ci_image,
      has_reference_image
  ) sub;

  -- 에러 분포
  SELECT COALESCE(jsonb_agg(row ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_by_error
  FROM (
    SELECT jsonb_build_object(
      'error_type', COALESCE(error_type, '성공'),
      'count',      COUNT(*)::bigint
    ) AS row,
    COUNT(*) AS cnt
    FROM public.ai_generation_logs
    WHERE created_at >= p_start_date
      AND created_at <  p_end_date + 1
    GROUP BY error_type
  ) sub;

  RETURN jsonb_build_object(
    'summary',       v_summary,
    'by_model',      v_by_model,
    'by_input_type', v_by_input_type,
    'by_pattern',    v_by_pattern,
    'by_error',      v_by_error
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_generation_stats(date, date) TO authenticated;

-- ═══════════════════════════════════════════════════════
-- 4. RPC: admin_get_generation_logs
-- ═══════════════════════════════════════════════════════

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

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 200';
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
    AND l.created_at <  p_end_date + 1
    AND (p_ai_model IS NULL OR l.ai_model = p_ai_model)
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_generation_logs(date, date, text, integer, integer) TO authenticated;
