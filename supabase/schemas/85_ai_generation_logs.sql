-- =============================================================
-- 85_ai_generation_logs.sql  –  AI 생성 운영 로그 원장
-- =============================================================

CREATE TABLE public.ai_generation_logs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          text        NOT NULL,
  phase                text        NOT NULL CHECK (phase IN ('analysis', 'prep', 'render')),
  work_id              text        NOT NULL UNIQUE,
  parent_work_id       text        REFERENCES public.ai_generation_logs(work_id) ON DELETE SET NULL,
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_model             text        NOT NULL CHECK (ai_model IN ('openai', 'gemini', 'fal')),
  request_type         text        NOT NULL CHECK (request_type IN ('analysis', 'prep', 'render_standard', 'render_high')),
  quality              text        CHECK (quality IN ('standard', 'high')),
  user_message         text        NOT NULL,
  conversation_turn    integer     NOT NULL DEFAULT 0,
  prompt_length        integer,
  request_attachments  jsonb,
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
  route                text        CHECK (route IN ('openai', 'fal_tiling', 'fal_edit', 'fal_controlnet', 'fal_inpaint')),
  route_reason         text,
  route_signals        jsonb,
  base_image_work_id   text        REFERENCES public.ai_generation_logs(work_id) ON DELETE SET NULL,
  fal_request_id       text,
  render_backend       text        CHECK (render_backend IN ('ip_adapter', 'img2img', 'nano_banana_edit', 'controlnet', 'flux_fill')),
  seed                 bigint,
  ai_message           text,
  image_generated      boolean     NOT NULL DEFAULT false,
  generated_image_url  text,
  pattern_preparation_backend text CHECK (pattern_preparation_backend IN ('local', 'openai_repair')),
  pattern_repair_prompt_kind text CHECK (pattern_repair_prompt_kind IN ('all_over_tile', 'one_point_motif')),
  pattern_repair_applied boolean,
  pattern_repair_reason_codes jsonb,
  prep_tokens_charged integer,
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
    (phase = 'prep' AND request_type = 'prep') OR
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
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_generation_logs TO service_role;

-- 운영 로그는 민감한 프롬프트/에러 정보를 포함하므로 관리자에게만 전체 조회를 허용한다.
CREATE POLICY "Admins can view all generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE TABLE public.ai_generation_log_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('prep', 'analysis', 'render')),
  artifact_type text NOT NULL,
  source_work_id text REFERENCES public.ai_generation_logs(work_id) ON DELETE SET NULL,
  parent_artifact_id uuid REFERENCES public.ai_generation_log_artifacts(id) ON DELETE SET NULL,
  storage_provider text NOT NULL DEFAULT 'imagekit',
  image_url text,
  image_width integer,
  image_height integer,
  mime_type text,
  file_size_bytes bigint,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_generation_log_artifacts_success_requires_image_url
    CHECK (status <> 'success' OR image_url IS NOT NULL)
);

CREATE INDEX idx_ai_generation_log_artifacts_workflow_created_at
  ON public.ai_generation_log_artifacts (workflow_id, created_at DESC);

CREATE INDEX idx_ai_generation_log_artifacts_workflow_phase_created_at
  ON public.ai_generation_log_artifacts (workflow_id, phase, created_at DESC);

CREATE INDEX idx_ai_generation_log_artifacts_source_work_id
  ON public.ai_generation_log_artifacts (source_work_id);

CREATE INDEX idx_ai_generation_log_artifacts_artifact_type
  ON public.ai_generation_log_artifacts (artifact_type);

ALTER TABLE public.ai_generation_log_artifacts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_generation_log_artifacts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_generation_log_artifacts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_generation_log_artifacts TO service_role;

CREATE POLICY "Admins can view all generation artifacts"
  ON public.ai_generation_log_artifacts FOR SELECT
  TO authenticated
  USING (public.is_admin());
