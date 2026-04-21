alter table public.ai_generation_logs
  add column request_attachments jsonb;

drop function if exists public.admin_get_generation_logs(date, date, text, integer, integer);

create function public.admin_get_generation_logs(
  p_start_date date,
  p_end_date date,
  p_ai_model text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  workflow_id text,
  phase text,
  work_id text,
  parent_work_id text,
  user_id uuid,
  ai_model text,
  request_type text,
  quality text,
  user_message text,
  prompt_length integer,
  request_attachments jsonb,
  design_context jsonb,
  normalized_design jsonb,
  conversation_turn integer,
  has_ci_image boolean,
  has_reference_image boolean,
  has_previous_image boolean,
  generate_image boolean,
  eligible_for_render boolean,
  missing_requirements jsonb,
  eligibility_reason text,
  detected_design jsonb,
  text_prompt text,
  image_prompt text,
  image_edit_prompt text,
  ai_message text,
  image_generated boolean,
  generated_image_url text,
  tokens_charged integer,
  tokens_refunded integer,
  text_latency_ms integer,
  image_latency_ms integer,
  total_latency_ms integer,
  error_type text,
  error_message text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path to public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.workflow_id,
    l.phase,
    l.work_id,
    l.parent_work_id,
    l.user_id,
    l.ai_model,
    l.request_type,
    l.quality,
    l.user_message,
    l.prompt_length,
    l.request_attachments,
    l.design_context,
    l.normalized_design,
    l.conversation_turn,
    l.has_ci_image,
    l.has_reference_image,
    l.has_previous_image,
    l.generate_image,
    l.eligible_for_render,
    l.missing_requirements,
    l.eligibility_reason,
    l.detected_design,
    l.text_prompt,
    l.image_prompt,
    l.image_edit_prompt,
    l.ai_message,
    l.image_generated,
    l.generated_image_url,
    l.tokens_charged,
    l.tokens_refunded,
    l.text_latency_ms,
    l.image_latency_ms,
    l.total_latency_ms,
    l.error_type,
    l.error_message,
    l.created_at
  from public.ai_generation_logs l
  where l.created_at::date between p_start_date and p_end_date
    and (p_ai_model is null or l.ai_model = p_ai_model)
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

grant execute on function public.admin_get_generation_logs(date, date, text, integer, integer) to authenticated;
