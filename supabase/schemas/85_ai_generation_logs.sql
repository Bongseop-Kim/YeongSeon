-- =============================================================
-- 85_ai_generation_logs.sql  –  AI 생성 운영 로그 원장
-- =============================================================

CREATE TABLE public.ai_generation_logs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          text        NOT NULL,
  phase                text        NOT NULL CHECK (phase IN ('analysis', 'render')),
  work_id              text        NOT NULL UNIQUE,
  parent_work_id       text        REFERENCES public.ai_generation_logs(work_id),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_model             text        NOT NULL CHECK (ai_model IN ('openai', 'gemini', 'fal')),
  request_type         text        NOT NULL CHECK (request_type IN ('analysis', 'render_standard', 'render_high')),
  quality              text        CHECK (quality IN ('standard', 'high')),
  user_message         text        NOT NULL,
  conversation_turn    integer     NOT NULL DEFAULT 0,
  prompt_length        integer,
  design_context       jsonb,
  normalized_design    jsonb,
  has_ci_image         boolean,
  has_reference_image  boolean,
  has_previous_image   boolean,
  generate_image       boolean,
  eligible_for_render  boolean,
  missing_requirements  jsonb,
  eligibility_reason   text,
  detected_design      jsonb,
  text_prompt          text,
  image_prompt         text,
  image_edit_prompt    text,
  ai_message           text,
  image_generated      boolean     NOT NULL DEFAULT false,
  generated_image_url  text,
  tokens_charged       integer     NOT NULL DEFAULT 0,
  tokens_refunded      integer     NOT NULL DEFAULT 0,
  text_latency_ms      integer,
  image_latency_ms     integer,
  total_latency_ms     integer,
  error_type           text,
  error_message        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_ai_generation_phase_request_type CHECK (
    (phase = 'analysis' AND request_type = 'analysis') OR
    (phase = 'render' AND request_type IN ('render_standard', 'render_high'))
  )
);

CREATE INDEX idx_ai_gen_logs_workflow       ON public.ai_generation_logs (workflow_id, created_at DESC);
CREATE INDEX idx_ai_gen_logs_parent_work_id ON public.ai_generation_logs (parent_work_id, created_at DESC);
CREATE INDEX idx_ai_gen_logs_user           ON public.ai_generation_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_gen_logs_model          ON public.ai_generation_logs (ai_model, created_at DESC);
CREATE INDEX idx_ai_gen_logs_created        ON public.ai_generation_logs (created_at DESC);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_generation_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_generation_logs TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.ai_generation_logs TO service_role;

-- 운영 로그는 민감한 프롬프트/에러 정보를 포함하므로 관리자에게만 전체 조회를 허용한다.
CREATE POLICY "Admins can view all generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
