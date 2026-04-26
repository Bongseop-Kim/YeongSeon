alter table public.ai_generation_logs
  add column if not exists repeat_tile_url text,
  add column if not exists repeat_tile_work_id text,
  add column if not exists accent_tile_url text,
  add column if not exists accent_tile_work_id text,
  add column if not exists pattern_type text,
  add column if not exists fabric_type text,
  add column if not exists tile_role text,
  add column if not exists paired_tile_work_id text,
  add column if not exists accent_layout_json jsonb;

alter table public.ai_generation_logs
  drop constraint ai_generation_logs_route_check;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_route_check
  check (route in ('openai', 'fal_tiling', 'fal_edit', 'fal_controlnet', 'fal_inpaint', 'tile_generation', 'tile_edit'));
