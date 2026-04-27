update public.design_chat_sessions
set pattern_type = null
where pattern_type is not null
  and pattern_type not in ('all_over', 'one_point');

update public.design_chat_sessions
set fabric_type = null
where fabric_type is not null
  and fabric_type not in ('yarn_dyed', 'printed');

alter table public.design_chat_sessions
  add constraint design_chat_sessions_pattern_type_check
  check (pattern_type is null or pattern_type in ('all_over', 'one_point'));

alter table public.design_chat_sessions
  add constraint design_chat_sessions_fabric_type_check
  check (fabric_type is null or fabric_type in ('yarn_dyed', 'printed'));

drop function if exists public.admin_get_generation_log_artifacts(text);

create or replace function public.admin_get_generation_log_artifacts(
  p_workflow_id text,
  p_limit integer default 100,
  p_offset integer default 0
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
set search_path to public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_workflow_id is null or btrim(p_workflow_id) = '' then
    raise exception 'p_workflow_id is required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'p_limit must be between 1 and 500';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'p_offset must be greater than or equal to 0';
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
  order by a.created_at asc, a.id asc
  limit p_limit
  offset p_offset;
end;
$$;

grant execute on function public.admin_get_generation_log_artifacts(text, integer, integer) to authenticated;

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

  with filtered_logs as (
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

grant execute on function public.admin_get_generation_stats(date, date) to authenticated;
