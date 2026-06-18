-- =============================================================
-- 81_motifs.sql  –  seamless-tile 엔진의 motif 라이브러리 (SVG primitive 레지스트리)
-- =============================================================
-- Python seamless-tile 서비스가 direct Postgres DSN(서버 사이드, RLS 우회)으로 읽고/쓰는
-- motif 레지스트리. 스키마 소유는 이 모노레포이며 seamless-tile은 클라이언트로만 접근한다.
-- 배경: seamless-tile 레포 ARCHITECTURE.md "영속화 — Supabase 공유 DB & 마이그레이션 소유권".

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.motifs (
  id            text              PRIMARY KEY,                  -- content-hash id (register_motif)
  symbol        text              NOT NULL,                     -- normalized <symbol> SVG
  color_slots   jsonb             NOT NULL DEFAULT '["s0"]'::jsonb,
  bbox          jsonb             NOT NULL,                     -- [min_x, min_y, max_x, max_y]
  anchor        jsonb             NOT NULL,                     -- [x, y]
  subject       text,
  part          text,
  view          text,
  expression    text,
  style         text,
  description   text,
  tags          text[]            NOT NULL DEFAULT '{}',
  embedding     extensions.vector,                              -- nullable; 임베딩 검색은 S11/P3
  source        text              NOT NULL DEFAULT 'recraft',   -- 'llm' | 'recraft'
  status        text              NOT NULL DEFAULT 'auto',      -- 'auto' | 'curated'
  quality       real,
  variant_group text,
  created_at    timestamptz       NOT NULL DEFAULT now()
);

-- P0: ivfflat(vector) 인덱스 없음 — 카탈로그가 작아 seq scan으로 충분, 임베딩 검색은 S11/P3로 미룸.
CREATE INDEX motifs_variant_group_idx ON public.motifs (variant_group);
CREATE INDEX motifs_subject_part_idx  ON public.motifs (subject, part);

ALTER TABLE public.motifs ENABLE ROW LEVEL SECURITY;

-- 서버 사이드 전용: seamless-tile이 direct DSN으로 접근한다. PostgREST(anon/authenticated) 노출은
-- 없으며, 프론트에서 motif를 직접 읽어야 하면 그때 SELECT 정책을 추가한다.
REVOKE ALL ON TABLE public.motifs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.motifs TO service_role;
