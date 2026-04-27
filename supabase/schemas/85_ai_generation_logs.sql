-- =============================================================
-- 85_ai_generation_logs.sql  –  AI 생성 운영 로그 원장
-- =============================================================

CREATE TABLE public.ai_generation_logs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          text        NOT NULL,
  phase                text        NOT NULL CHECK (phase = 'render'),
  work_id              text        NOT NULL UNIQUE,
  parent_work_id       text        REFERENCES public.ai_generation_logs(work_id) ON DELETE SET NULL,
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_model             text        NOT NULL CHECK (ai_model IN ('openai')),
  request_type         text        NOT NULL CHECK (request_type = 'render_standard'),
  quality              text        CHECK (quality = 'standard'),
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
  detected_design      jsonb,
  image_prompt         text,
  route                text        CHECK (route IN ('openai', 'tile_generation', 'tile_edit')),
  ai_message           text,
  image_generated      boolean     NOT NULL DEFAULT false,
  generated_image_url  text,
  repeat_tile_url      text,
  repeat_tile_work_id  text,
  accent_tile_url      text,
  accent_tile_work_id  text,
  pattern_type         text,
  fabric_type          text,
  tile_role            text,
  paired_tile_work_id  text,
  accent_layout_json   jsonb,
  tokens_charged       integer     NOT NULL DEFAULT 0,
  tokens_refunded      integer     NOT NULL DEFAULT 0,
  text_latency_ms      integer,
  image_latency_ms     integer,
  total_latency_ms     integer,
  error_type           text,
  error_message        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_ai_generation_phase_request_type CHECK (
    phase = 'render' AND request_type = 'render_standard'
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
  phase text NOT NULL CHECK (phase = 'render'),
  artifact_type text NOT NULL,
  source_work_id text REFERENCES public.ai_generation_logs(work_id) ON DELETE CASCADE,
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

CREATE INDEX idx_ai_generation_log_artifacts_parent_artifact_id
  ON public.ai_generation_log_artifacts (parent_artifact_id);

CREATE INDEX idx_ai_generation_log_artifacts_artifact_type
  ON public.ai_generation_log_artifacts (artifact_type);

ALTER TABLE public.ai_generation_log_artifacts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_generation_log_artifacts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_generation_log_artifacts TO authenticated;
GRANT INSERT ON TABLE public.ai_generation_log_artifacts TO service_role;

CREATE POLICY "Admins can view all generation artifacts"
  ON public.ai_generation_log_artifacts FOR SELECT
  TO authenticated
  USING (public.is_admin());
