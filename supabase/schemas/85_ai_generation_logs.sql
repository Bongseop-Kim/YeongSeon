-- =============================================================
-- 85_ai_generation_logs.sql  –  AI 생성 로그 원장
-- =============================================================

CREATE TABLE public.ai_generation_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id             text        NOT NULL UNIQUE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  ai_model            text        NOT NULL CHECK (ai_model IN ('openai', 'gemini')),
  request_type        text        CHECK (request_type IN ('text_only', 'text_and_image')),
  quality             text        CHECK (quality IN ('standard', 'high')),

  user_message        text        NOT NULL,
  prompt_length       integer     NOT NULL,
  design_context      jsonb,
  conversation_turn   integer     NOT NULL DEFAULT 0,
  has_ci_image        boolean     NOT NULL DEFAULT false,
  has_reference_image boolean     NOT NULL DEFAULT false,
  has_previous_image  boolean     NOT NULL DEFAULT false,

  ai_message          text,
  generate_image      boolean,
  image_generated     boolean     NOT NULL DEFAULT false,
  detected_design     jsonb,

  tokens_charged      integer     NOT NULL DEFAULT 0,
  tokens_refunded     integer     NOT NULL DEFAULT 0,

  text_latency_ms     integer,
  image_latency_ms    integer,
  total_latency_ms    integer,

  error_type          text,
  error_message       text,

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_gen_logs_user    ON public.ai_generation_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_gen_logs_model   ON public.ai_generation_logs (ai_model, created_at DESC);
CREATE INDEX idx_ai_gen_logs_created ON public.ai_generation_logs (created_at DESC);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can view all generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
