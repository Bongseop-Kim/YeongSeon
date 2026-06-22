-- =============================================================
-- 86_seamless_generation_logs.sql  –  Seamless 엔진 생성 운영 로그 원장
-- =============================================================
-- seamless-tile 파이썬 서비스가 /generate 요청 1건당 1행을 적재한다.
-- candidate preview PNG 는 storage 버킷 seamless-previews 에 업로드되고
-- candidates jsonb 의 png_url 로 참조된다.

CREATE TABLE public.seamless_generation_logs (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id                text,
  input_type                text        NOT NULL CHECK (input_type IN ('intent','prompt','reference_image')),
  prompt                    text,
  has_reference_image       boolean     NOT NULL DEFAULT false,
  reference_image_bytes     integer,
  colorway                  text,
  seed                      bigint,
  candidate_count_requested integer,
  candidate_count_returned  integer,
  distinct_layouts          integer,
  available_strategies      integer,
  engine_version            text,
  registry_version          text,
  intent                    jsonb,
  candidates                jsonb,
  warnings                  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  generate_ms               numeric,
  render_ms                 numeric,
  status                    text        NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','error')),
  error_type                text,
  error_message             text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.seamless_generation_logs.candidates
  IS 'array of {id,layout_id,source_fidelity,colorway_id,seed,svg,png_url}';

CREATE INDEX idx_seamless_gen_logs_created     ON public.seamless_generation_logs (created_at DESC);
CREATE INDEX idx_seamless_gen_logs_input_type  ON public.seamless_generation_logs (input_type, created_at DESC);
CREATE INDEX idx_seamless_gen_logs_status      ON public.seamless_generation_logs (status, created_at DESC);
CREATE INDEX idx_seamless_gen_logs_request_id  ON public.seamless_generation_logs (request_id);

ALTER TABLE public.seamless_generation_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.seamless_generation_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.seamless_generation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.seamless_generation_logs TO service_role;

-- 운영 로그는 민감한 프롬프트/에러 정보를 포함하므로 관리자에게만 전체 조회를 허용한다.
CREATE POLICY "Admins can view all seamless generation logs"
  ON public.seamless_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
