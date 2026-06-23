-- ── admin_get_seamless_generation_logs ──────────────────────────
-- seamless 생성 로그 목록. 무거운 intent 와 candidate.svg 는 제외하고
-- 썸네일 표시에 필요한 candidate.id/layout_id/source_fidelity/colorway_id/seed/png_url 만 남긴다.
CREATE OR REPLACE FUNCTION public.admin_get_seamless_generation_logs(
  p_start_date  date    DEFAULT NULL,
  p_end_date    date    DEFAULT NULL,
  p_input_type  text    DEFAULT NULL,
  p_status      text    DEFAULT NULL,
  p_id_search   text    DEFAULT NULL,
  p_limit       integer DEFAULT 50,
  p_offset      integer DEFAULT 0
)
RETURNS TABLE (
  id                        uuid,
  request_id                text,
  input_type                text,
  prompt                    text,
  has_reference_image       boolean,
  reference_image_bytes     integer,
  colorway                  text,
  seed                      bigint,
  candidate_count_requested integer,
  candidate_count_returned  integer,
  distinct_layouts          integer,
  available_strategies      integer,
  engine_version            text,
  registry_version          text,
  candidates                jsonb,
  warnings                  jsonb,
  generate_ms               numeric,
  render_ms                 numeric,
  status                    text,
  error_type                text,
  error_message             text,
  created_at                timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  p_limit := least(greatest(coalesce(p_limit, 50), 0), 500);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.request_id,
    l.input_type,
    l.prompt,
    l.has_reference_image,
    l.reference_image_bytes,
    l.colorway,
    l.seed,
    l.candidate_count_requested,
    l.candidate_count_returned,
    l.distinct_layouts,
    l.available_strategies,
    l.engine_version,
    l.registry_version,
    case
      when jsonb_typeof(l.candidates) = 'array' then (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', c->'id',
              'layout_id', c->'layout_id',
              'source_fidelity', c->'source_fidelity',
              'colorway_id', c->'colorway_id',
              'seed', c->'seed',
              'png_url', c->'png_url'
            )
            order by ord
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(l.candidates) with ordinality as t(c, ord)
      )
      else l.candidates
    end as candidates,
    l.warnings,
    l.generate_ms,
    l.render_ms,
    l.status,
    l.error_type,
    l.error_message,
    l.created_at
  from public.seamless_generation_logs l
  where (
      p_start_date is null
      or p_end_date is null
      or (
        l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz
        and l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz
      )
    )
    and (p_input_type is null or l.input_type = p_input_type)
    and (p_status     is null or l.status     = p_status)
    and (
      p_id_search is null
      or l.request_id = p_id_search
      or l.id::text = p_id_search
    )
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

COMMENT ON FUNCTION public.admin_get_seamless_generation_logs(
  date, date, text, text, text, integer, integer
) IS 'Admin-only seamless generation log listing. Excludes heavy intent and per-candidate svg; keeps candidate id/layout_id/source_fidelity/colorway_id/seed/png_url for thumbnails. Filters: input_type / status(success|partial|error) / id_search(request_id|id exact).';

GRANT EXECUTE ON FUNCTION public.admin_get_seamless_generation_logs(
  date, date, text, text, text, integer, integer
) TO authenticated;

-- ── admin_get_seamless_generation_log ───────────────────────────
-- 단건 전체 조회 (intent + candidates 전체, svg 포함).
CREATE OR REPLACE FUNCTION public.admin_get_seamless_generation_log(
  p_id uuid
)
RETURNS TABLE (
  id                        uuid,
  request_id                text,
  input_type                text,
  prompt                    text,
  has_reference_image       boolean,
  reference_image_bytes     integer,
  colorway                  text,
  seed                      bigint,
  candidate_count_requested integer,
  candidate_count_returned  integer,
  distinct_layouts          integer,
  available_strategies      integer,
  engine_version            text,
  registry_version          text,
  intent                    jsonb,
  candidates                jsonb,
  warnings                  jsonb,
  generate_ms               numeric,
  render_ms                 numeric,
  status                    text,
  error_type                text,
  error_message             text,
  created_at                timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.request_id,
    l.input_type,
    l.prompt,
    l.has_reference_image,
    l.reference_image_bytes,
    l.colorway,
    l.seed,
    l.candidate_count_requested,
    l.candidate_count_returned,
    l.distinct_layouts,
    l.available_strategies,
    l.engine_version,
    l.registry_version,
    l.intent,
    l.candidates,
    l.warnings,
    l.generate_ms,
    l.render_ms,
    l.status,
    l.error_type,
    l.error_message,
    l.created_at
  from public.seamless_generation_logs l
  where l.id = p_id;
end;
$$;

COMMENT ON FUNCTION public.admin_get_seamless_generation_log(uuid)
  IS 'Admin-only single seamless generation log including full intent and candidates (svg + png_url).';

GRANT EXECUTE ON FUNCTION public.admin_get_seamless_generation_log(uuid) TO authenticated;

-- ── admin_get_seamless_generation_stats ─────────────────────────
-- 기간 요약 + input_type 별 + status 별 집계.
CREATE OR REPLACE FUNCTION public.admin_get_seamless_generation_stats(
  p_start_date date,
  p_end_date   date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
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
    from public.seamless_generation_logs
    where created_at >= v_start_at
      and created_at < v_end_at
  ),
  summary_data as (
    select jsonb_build_object(
      'total', count(*)::integer,
      'success_count', count(*) filter (where status = 'success')::integer,
      'partial_count', count(*) filter (where status = 'partial')::integer,
      'error_count', count(*) filter (where status = 'error')::integer,
      'avg_generate_ms', avg(generate_ms),
      'avg_render_ms', avg(render_ms)
    ) as value
    from filtered_logs
  ),
  by_input_type_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'input_type', input_type,
          'count', count
        )
        order by count desc, input_type
      ),
      '[]'::jsonb
    ) as value
    from (
      select input_type, count(*)::integer as count
      from filtered_logs
      group by input_type
    ) input_type_stats
  ),
  by_status_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'status', status,
          'count', count
        )
        order by count desc, status
      ),
      '[]'::jsonb
    ) as value
    from (
      select status, count(*)::integer as count
      from filtered_logs
      group by status
    ) status_stats
  )
  select jsonb_build_object(
    'summary', summary_data.value,
    'by_input_type', by_input_type_data.value,
    'by_status', by_status_data.value
  )
  into v_result
  from summary_data, by_input_type_data, by_status_data;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

COMMENT ON FUNCTION public.admin_get_seamless_generation_stats(date, date)
  IS 'Admin-only seamless generation stats: summary (total, success/partial/error, avg generate_ms/render_ms), by_input_type, by_status.';

GRANT EXECUTE ON FUNCTION public.admin_get_seamless_generation_stats(date, date) TO authenticated;
