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

create function public.write_ai_generation_log_artifact(
  p_id uuid,
  p_workflow_id text,
  p_phase text,
  p_artifact_type text,
  p_source_work_id text,
  p_parent_artifact_id uuid,
  p_storage_provider text,
  p_image_url text,
  p_image_width integer,
  p_image_height integer,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_status text,
  p_meta jsonb
)
returns void
language plpgsql
security invoker
set search_path to 'public'
as $$
begin
  insert into public.ai_generation_log_artifacts (
    id,
    workflow_id,
    phase,
    artifact_type,
    source_work_id,
    parent_artifact_id,
    storage_provider,
    image_url,
    image_width,
    image_height,
    mime_type,
    file_size_bytes,
    status,
    meta
  ) values (
    p_id,
    p_workflow_id,
    p_phase,
    p_artifact_type,
    p_source_work_id,
    p_parent_artifact_id,
    p_storage_provider,
    p_image_url,
    p_image_width,
    p_image_height,
    p_mime_type,
    p_file_size_bytes,
    p_status,
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

comment on function public.write_ai_generation_log_artifact(
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
) is 'Service-role RPC used by Edge Functions to record ai_generation_log_artifacts without direct table inserts.';

grant execute on function public.write_ai_generation_log_artifact(
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
) to service_role;

notify pgrst, 'reload schema';
