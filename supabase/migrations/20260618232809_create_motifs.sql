CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.motifs (
  id            text              PRIMARY KEY,
  symbol        text              NOT NULL,
  color_slots   jsonb             NOT NULL DEFAULT '["s0"]'::jsonb,
  bbox          jsonb             NOT NULL,
  anchor        jsonb             NOT NULL,
  subject       text,
  part          text,
  view          text,
  expression    text,
  style         text,
  description   text,
  tags          text[]            NOT NULL DEFAULT '{}',
  embedding     extensions.vector,
  source        text              NOT NULL DEFAULT 'recraft',
  status        text              NOT NULL DEFAULT 'auto',
  quality       real,
  variant_group text,
  created_at    timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX motifs_variant_group_idx ON public.motifs (variant_group);
CREATE INDEX motifs_subject_part_idx  ON public.motifs (subject, part);

ALTER TABLE public.motifs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.motifs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.motifs TO service_role;
