create table public.ai_generation_log_artifacts (
  id uuid primary key default gen_random_uuid(),
  workflow_id text not null,
  phase text not null check (phase in ('prep', 'analysis', 'render')),
  artifact_type text not null,
  source_work_id text references public.ai_generation_logs(work_id) on delete set null,
  parent_artifact_id uuid references public.ai_generation_log_artifacts(id) on delete set null,
  storage_provider text not null default 'imagekit',
  image_url text,
  image_width integer,
  image_height integer,
  mime_type text,
  file_size_bytes bigint,
  status text not null check (status in ('success', 'partial', 'failed')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_generation_log_artifacts_success_requires_image_url
    check (status <> 'success' or image_url is not null)
);

create index idx_ai_generation_log_artifacts_workflow_created_at
  on public.ai_generation_log_artifacts (workflow_id, created_at desc);

create index idx_ai_generation_log_artifacts_workflow_phase_created_at
  on public.ai_generation_log_artifacts (workflow_id, phase, created_at desc);

create index idx_ai_generation_log_artifacts_source_work_id
  on public.ai_generation_log_artifacts (source_work_id);

create index idx_ai_generation_log_artifacts_artifact_type
  on public.ai_generation_log_artifacts (artifact_type);

alter table public.ai_generation_log_artifacts enable row level security;

revoke all on table public.ai_generation_log_artifacts from public, anon, authenticated;
grant select on table public.ai_generation_log_artifacts to authenticated;
grant select, insert, update on table public.ai_generation_log_artifacts to service_role;

create policy "Admins can view all generation artifacts"
  on public.ai_generation_log_artifacts for select
  to authenticated
  using (public.is_admin());

create or replace function public.admin_get_generation_log_artifacts(
  p_workflow_id text
)
returns table (
  id uuid,
  workflow_id text,
  phase text,
  artifact_type text,
  source_work_id text,
  parent_artifact_id uuid,
  storage_provider text,
  image_url text,
  image_width integer,
  image_height integer,
  mime_type text,
  file_size_bytes bigint,
  status text,
  meta jsonb,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_workflow_id is null or btrim(p_workflow_id) = '' then
    raise exception 'p_workflow_id is required';
  end if;

  return query
  select
    a.id,
    a.workflow_id,
    a.phase,
    a.artifact_type,
    a.source_work_id,
    a.parent_artifact_id,
    a.storage_provider,
    a.image_url,
    a.image_width,
    a.image_height,
    a.mime_type,
    a.file_size_bytes,
    a.status,
    a.meta,
    a.created_at
  from public.ai_generation_log_artifacts a
  where a.workflow_id = p_workflow_id
  order by a.created_at asc, a.id asc;
end;
$$;

grant execute on function public.admin_get_generation_log_artifacts(text) to authenticated;
