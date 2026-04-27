drop function if exists public.admin_get_generation_logs(date, date, text, integer, integer);
create function public.admin_get_generation_logs(
  p_start_date      date,
  p_end_date        date,
  p_ai_model        text    default null,
  p_limit           integer default 50,
  p_offset          integer default 0,
  p_id              uuid    default null,
  p_request_type    text    default null,
  p_status          text    default null,
  p_id_search       text    default null
)
returns table (
  id                          uuid,
  workflow_id                 text,
  phase                       text,
  work_id                     text,
  parent_work_id              text,
  user_id                     uuid,
  ai_model                    text,
  request_type                text,
  quality                     text,
  user_message                text,
  prompt_length               integer,
  request_attachments         jsonb,
  design_context              jsonb,
  normalized_design           jsonb,
  conversation_turn           integer,
  has_ci_image                boolean,
  has_reference_image         boolean,
  has_previous_image          boolean,
  generate_image              boolean,
  eligible_for_render         boolean,
  missing_requirements        jsonb,
  eligibility_reason          text,
  detected_design             jsonb,
  text_prompt                 text,
  image_prompt                text,
  image_edit_prompt           text,
  ai_message                  text,
  image_generated             boolean,
  generated_image_url         text,
  pattern_preparation_backend text,
  pattern_repair_prompt_kind  text,
  pattern_repair_applied      boolean,
  pattern_repair_reason_codes jsonb,
  prep_tokens_charged         integer,
  tokens_charged              integer,
  tokens_refunded             integer,
  text_latency_ms             integer,
  image_latency_ms            integer,
  total_latency_ms            integer,
  error_type                  text,
  error_message               text,
  created_at                  timestamptz
)
language plpgsql
security invoker
set search_path to public
as $$
begin
  p_limit := least(coalesce(p_limit, 50), 500);

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id, l.user_id,
    l.ai_model, l.request_type, l.quality, l.user_message, l.prompt_length,
    l.request_attachments, l.design_context, l.normalized_design,
    l.conversation_turn, l.has_ci_image, l.has_reference_image,
    l.has_previous_image, l.generate_image, l.eligible_for_render,
    l.missing_requirements, l.eligibility_reason, l.detected_design,
    l.text_prompt, l.image_prompt, l.image_edit_prompt, l.ai_message,
    l.image_generated, l.generated_image_url, l.pattern_preparation_backend,
    l.pattern_repair_prompt_kind, l.pattern_repair_applied,
    l.pattern_repair_reason_codes, l.prep_tokens_charged,
    l.tokens_charged, l.tokens_refunded,
    l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
    l.error_type, l.error_message, l.created_at
  from public.ai_generation_logs l
  where (p_id is not null or p_id_search is not null or (
      l.created_at >= p_start_date::timestamptz
      and l.created_at < (p_end_date + 1)::timestamptz
    ))
    and (p_ai_model      is null or l.ai_model      = p_ai_model)
    and (p_id            is null or l.id            = p_id)
    and (p_request_type  is null or l.request_type  = p_request_type)
    and (p_status        is null
         or (p_status = 'success' and l.error_type is null)
         or (p_status = 'error'   and l.error_type is not null))
    and (p_id_search     is null
         or l.workflow_id = p_id_search
         or l.work_id     = p_id_search)
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

comment on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) is 'Admin-only listing with optional filters: id / request_type / status(success|error) / id_search(workflow_id|work_id exact).';

grant execute on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) to authenticated;
