drop function if exists public.admin_get_generation_log_artifacts(text, integer, integer);
drop function if exists public.admin_get_generation_log_artifacts(text);
drop function if exists public.write_ai_generation_log_artifact(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  bigint,
  text,
  jsonb
);
drop table if exists public.ai_generation_log_artifacts;
