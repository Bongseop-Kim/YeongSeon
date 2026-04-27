drop function if exists public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
);

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
  id                    uuid,
  workflow_id           text,
  phase                 text,
  work_id               text,
  parent_work_id        text,
  user_id               uuid,
  ai_model              text,
  request_type          text,
  quality               text,
  user_message          text,
  prompt_length         integer,
  request_attachments   jsonb,
  design_context        jsonb,
  normalized_design     jsonb,
  conversation_turn     integer,
  has_ci_image          boolean,
  has_reference_image   boolean,
  has_previous_image    boolean,
  generate_image        boolean,
  detected_design       jsonb,
  image_prompt          text,
  ai_message            text,
  image_generated       boolean,
  generated_image_url   text,
  tokens_charged        integer,
  tokens_refunded       integer,
  text_latency_ms       integer,
  image_latency_ms      integer,
  total_latency_ms      integer,
  error_type            text,
  error_message         text,
  created_at            timestamptz
)
language plpgsql
security invoker
set search_path to public
as $$
begin
  p_limit := least(greatest(coalesce(p_limit, 50), 0), 500);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_id_search is not null then
    return query
    (
      select
        l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id,
        l.user_id, l.ai_model, l.request_type, l.quality, l.user_message,
        l.prompt_length, l.request_attachments, l.design_context,
        l.normalized_design, l.conversation_turn, l.has_ci_image,
        l.has_reference_image, l.has_previous_image, l.generate_image,
        l.detected_design, l.image_prompt, l.ai_message, l.image_generated,
        l.generated_image_url, l.tokens_charged, l.tokens_refunded,
        l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
        l.error_type, l.error_message, l.created_at
      from public.ai_generation_logs l
      where l.workflow_id = p_id_search
        and (p_ai_model     is null or l.ai_model     = p_ai_model)
        and (p_id           is null or l.id           = p_id)
        and (p_request_type is null or l.request_type = p_request_type)
        and (p_status       is null
             or (p_status = 'success' and l.error_type is null)
             or (p_status = 'error'   and l.error_type is not null))
      union all
      select
        l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id,
        l.user_id, l.ai_model, l.request_type, l.quality, l.user_message,
        l.prompt_length, l.request_attachments, l.design_context,
        l.normalized_design, l.conversation_turn, l.has_ci_image,
        l.has_reference_image, l.has_previous_image, l.generate_image,
        l.detected_design, l.image_prompt, l.ai_message, l.image_generated,
        l.generated_image_url, l.tokens_charged, l.tokens_refunded,
        l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
        l.error_type, l.error_message, l.created_at
      from public.ai_generation_logs l
      where l.work_id = p_id_search
        and l.workflow_id is distinct from p_id_search
        and (p_ai_model     is null or l.ai_model     = p_ai_model)
        and (p_id           is null or l.id           = p_id)
        and (p_request_type is null or l.request_type = p_request_type)
        and (p_status       is null
             or (p_status = 'success' and l.error_type is null)
             or (p_status = 'error'   and l.error_type is not null))
    )
    order by created_at desc
    limit p_limit
    offset p_offset;
  else
    return query
      select
        l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id,
        l.user_id, l.ai_model, l.request_type, l.quality, l.user_message,
        l.prompt_length, l.request_attachments, l.design_context,
        l.normalized_design, l.conversation_turn, l.has_ci_image,
        l.has_reference_image, l.has_previous_image, l.generate_image,
        l.detected_design, l.image_prompt, l.ai_message, l.image_generated,
        l.generated_image_url, l.tokens_charged, l.tokens_refunded,
        l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
        l.error_type, l.error_message, l.created_at
      from public.ai_generation_logs l
      where (p_id is not null or (
          l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz
          and l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz
        ))
        and (p_ai_model     is null or l.ai_model     = p_ai_model)
        and (p_id           is null or l.id           = p_id)
        and (p_request_type is null or l.request_type = p_request_type)
        and (p_status       is null
             or (p_status = 'success' and l.error_type is null)
             or (p_status = 'error'   and l.error_type is not null))
      order by l.created_at desc
      limit p_limit
      offset p_offset;
  end if;
end;
$$;

comment on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) is 'Admin-only listing with optional filters: id / request_type / status(success|error) / id_search(workflow_id|work_id exact). p_id_search path uses UNION ALL of two equality lookups so each can use its index instead of being defeated by OR-on-different-columns.';

grant execute on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) to authenticated;

create or replace function public.admin_get_generation_stats(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security invoker
set search_path to public
as $$
declare
  v_result jsonb;
  v_start_at timestamptz := p_start_date::timestamp at time zone 'UTC';
  v_end_at timestamptz := (p_end_date + 1)::timestamp at time zone 'UTC';
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  with filtered_logs as materialized (
    select *
    from public.ai_generation_logs
    where created_at >= v_start_at
      and created_at < v_end_at
  ),
  summary_data as (
    select jsonb_build_object(
      'total_count', count(*)::integer,
      'image_generated_count', count(*) filter (where image_generated)::integer,
      'avg_tokens_charged', avg(tokens_charged),
      'avg_text_latency_ms', avg(text_latency_ms),
      'avg_image_latency_ms', avg(image_latency_ms),
      'avg_total_latency_ms', avg(total_latency_ms),
      'total_requests', count(*)::integer,
      'image_success_rate',
      case
        when count(*) filter (where generate_image is true) = 0 then 0
        else round(
          (
            count(*) filter (where image_generated)::numeric
            / count(*) filter (where generate_image is true)
          ),
          4
        )
      end,
      'total_tokens_consumed',
      coalesce(sum(coalesce(tokens_charged, 0) - coalesce(tokens_refunded, 0)), 0)
    ) as value
    from filtered_logs
  ),
  by_model_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'ai_model', ai_model,
          'count', count,
          'avg_tokens', avg_tokens,
          'error_count', error_count,
          'request_count', count,
          'avg_text_latency_ms', avg_text_latency_ms,
          'avg_image_latency_ms', avg_image_latency_ms,
          'avg_token_cost', avg_tokens,
          'image_success_rate', image_success_rate
        )
        order by count desc, ai_model
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        ai_model,
        count(*)::integer as count,
        avg(tokens_charged) as avg_tokens,
        count(*) filter (where error_type is not null)::integer as error_count,
        avg(text_latency_ms) as avg_text_latency_ms,
        avg(image_latency_ms) as avg_image_latency_ms,
        case
          when count(*) filter (
            where phase <> 'analysis' and generate_image is true
          ) = 0 then null
          else round(
            (
              count(*) filter (
                where phase <> 'analysis' and image_generated
              )::numeric
              / count(*) filter (
                where phase <> 'analysis' and generate_image is true
              )
            ),
            4
          )
        end as image_success_rate
      from filtered_logs
      group by ai_model
    ) model_stats
  ),
  by_input_type_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'input_type', input_type,
          'count', count,
          'request_count', count,
          'avg_latency_ms', avg_latency_ms,
          'avg_token_cost', avg_tokens,
          'image_success_rate', image_success_rate
        )
        order by count desc, input_type
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        case
          when phase = 'analysis' then '분석'
          when phase = 'prep' or request_type = 'prep' then '보정'
          when request_type = 'render_standard' then '렌더표준'
          when request_type = 'render_high' then '렌더고품질'
          else '기타'
        end as input_type,
        count(*)::integer as count,
        avg(total_latency_ms) as avg_latency_ms,
        avg(tokens_charged) as avg_tokens,
        case
          when case
            when phase = 'analysis' then '분석'
            when phase = 'prep' or request_type = 'prep' then '보정'
            when request_type = 'render_standard' then '렌더표준'
            when request_type = 'render_high' then '렌더고품질'
            else '기타'
          end = '분석' then null
          when count(*) filter (where generate_image is true) = 0 then 0
          else round(
            (
              count(*) filter (where image_generated)::numeric
              / count(*) filter (where generate_image is true)
            ),
            4
          )
        end as image_success_rate
      from filtered_logs
      group by
        case
          when phase = 'analysis' then '분석'
          when phase = 'prep' or request_type = 'prep' then '보정'
          when request_type = 'render_standard' then '렌더표준'
          when request_type = 'render_high' then '렌더고품질'
          else '기타'
        end
    ) input_type_stats
  ),
  by_pattern_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'pattern', pattern,
          'count', count,
          'request_count', count,
          'avg_token_cost', avg_tokens,
          'image_success_rate', image_success_rate
        )
        order by count desc, pattern
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        format(
          'generate_image=%s, has_ci_image=%s, has_reference_image=%s, has_previous_image=%s',
          coalesce(generate_image::text, 'null'),
          coalesce(has_ci_image::text, 'null'),
          coalesce(has_reference_image::text, 'null'),
          coalesce(has_previous_image::text, 'null')
        ) as pattern,
        count(*)::integer as count,
        avg(tokens_charged) as avg_tokens,
        case
          when count(*) filter (where generate_image is true) = 0 then 0
          else round(
            (
              count(*) filter (where image_generated)::numeric
              / count(*) filter (where generate_image is true)
            ),
            4
          )
        end as image_success_rate
      from filtered_logs
      group by
        generate_image,
        has_ci_image,
        has_reference_image,
        has_previous_image
    ) pattern_stats
  ),
  by_error_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'error_type', error_type,
          'count', count
        )
        order by count desc, error_type
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        coalesce(error_type, '성공') as error_type,
        count(*)::integer as count
      from filtered_logs
      group by coalesce(error_type, '성공')
    ) error_stats
  )
  select jsonb_build_object(
    'summary', summary_data.value,
    'by_model', by_model_data.value,
    'by_input_type', by_input_type_data.value,
    'by_pattern', by_pattern_data.value,
    'by_error', by_error_data.value
  )
  into v_result
  from summary_data, by_model_data, by_input_type_data, by_pattern_data, by_error_data;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

comment on function public.admin_get_generation_stats(date, date)
  is 'Admin-only generation stats. filtered_logs CTE is materialized so the base ai_generation_logs scan happens once instead of per downstream CTE.';

grant execute on function public.admin_get_generation_stats(date, date) to authenticated;
