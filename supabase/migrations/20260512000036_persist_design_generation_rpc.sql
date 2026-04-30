CREATE OR REPLACE FUNCTION public.persist_design_generation(
  generation jsonb,
  variants jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  v_user_id uuid := (generation->>'user_id')::uuid;
  v_variant jsonb;
BEGIN
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  IF jsonb_typeof(variants) IS DISTINCT FROM 'array' OR jsonb_array_length(variants) <> 4 THEN
    RAISE EXCEPTION 'persist_design_generation requires exactly 4 variants';
  END IF;

  INSERT INTO public.design_generations (
    id,
    user_id,
    prompt,
    pattern_type,
    fabric_type,
    request_metadata
  )
  VALUES (
    (generation->>'id')::uuid,
    v_user_id,
    generation->>'prompt',
    generation->>'pattern_type',
    generation->>'fabric_type',
    COALESCE(generation->'request_metadata', '{}'::jsonb)
  );

  FOR v_variant IN
    SELECT *
    FROM jsonb_array_elements(variants)
  LOOP
    INSERT INTO public.design_generation_variants (
      id,
      generation_id,
      variant_index,
      repeat_tile_url,
      repeat_tile_work_id,
      accent_tile_url,
      accent_tile_work_id,
      accent_layout_json,
      pattern_type,
      fabric_type
    )
    VALUES (
      (v_variant->>'id')::uuid,
      (generation->>'id')::uuid,
      (v_variant->>'variant_index')::int,
      v_variant->>'repeat_tile_url',
      v_variant->>'repeat_tile_work_id',
      v_variant->>'accent_tile_url',
      v_variant->>'accent_tile_work_id',
      NULLIF(v_variant->'accent_layout_json', 'null'::jsonb),
      v_variant->>'pattern_type',
      v_variant->>'fabric_type'
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.persist_design_generation(jsonb, jsonb)
  IS 'SECURITY DEFINER is required so Edge Functions can atomically persist an owned design generation bundle and child variants without granting direct table insert privileges; service_role bypasses auth.uid() ownership while authenticated callers must own the user_id.';

GRANT EXECUTE ON FUNCTION public.persist_design_generation(jsonb, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_generation_log_groups(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_ai_model text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_request_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_id_search text DEFAULT NULL
)
RETURNS TABLE (
  workflow_id text,
  primary_log_id uuid,
  primary_work_id text,
  user_id uuid,
  ai_model text,
  request_type text,
  user_message text,
  pattern_type text,
  fabric_type text,
  image_count integer,
  success_count integer,
  error_count integer,
  tokens_charged integer,
  tokens_refunded integer,
  total_latency_ms integer,
  created_at timestamptz,
  result_images jsonb
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
  with filtered_logs as (
    select l.*
    from public.ai_generation_logs l
    where (p_id_search is not null or (
        p_start_date is null
        or p_end_date is null
        or (
          l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz
          and l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz
        )
      ))
      and (p_ai_model is null or l.ai_model = p_ai_model)
      and (p_request_type is null or l.request_type = p_request_type)
      and (p_id_search is null or l.workflow_id = p_id_search or exists (
        select 1
        from public.ai_generation_logs matched
        where matched.work_id = p_id_search
          and matched.workflow_id = l.workflow_id
      ))
  ),
  grouped_logs as (
    select
      l.workflow_id,
      count(*)::integer as image_count,
      count(*) filter (where l.error_type is null and l.image_generated)::integer as success_count,
      count(*) filter (where l.error_type is not null or not l.image_generated)::integer as error_count,
      coalesce(sum(l.tokens_charged), 0)::integer as tokens_charged,
      coalesce(sum(l.tokens_refunded), 0)::integer as tokens_refunded,
      coalesce(sum(l.total_latency_ms), 0)::integer as total_latency_ms,
      max(l.created_at) as created_at,
      jsonb_agg(
        jsonb_build_object(
          'log_id', l.id,
          'work_id', l.work_id,
          'url', coalesce(l.generated_image_url, l.repeat_tile_url, l.accent_tile_url),
          'tile_role', l.tile_role,
          'status', case when l.error_type is not null or not l.image_generated then 'error' else 'success' end,
          'total_latency_ms', l.total_latency_ms
        )
        order by l.created_at asc, l.work_id asc
      ) as result_images
    from filtered_logs l
    group by l.workflow_id
  ),
  primary_logs as (
    select distinct on (l.workflow_id)
      l.workflow_id,
      l.id as primary_log_id,
      l.work_id as primary_work_id,
      l.user_id,
      l.ai_model,
      l.request_type,
      l.user_message,
      l.pattern_type,
      l.fabric_type
    from filtered_logs l
    order by l.workflow_id, l.created_at asc, l.work_id asc
  )
  select
    g.workflow_id,
    p.primary_log_id,
    p.primary_work_id,
    p.user_id,
    p.ai_model,
    p.request_type,
    p.user_message,
    p.pattern_type,
    p.fabric_type,
    g.image_count,
    g.success_count,
    g.error_count,
    g.tokens_charged,
    g.tokens_refunded,
    g.total_latency_ms,
    g.created_at,
    g.result_images
  from grouped_logs g
  join primary_logs p on p.workflow_id = g.workflow_id
  where p_status is null
    or (p_status = 'success' and g.error_count = 0)
    or (p_status = 'error' and g.error_count > 0)
  order by g.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_generation_log_groups(
  date, date, text, integer, integer, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.admin_get_generation_log_groups(
  date, date, text, integer, integer, text, text, text
) IS 'Admin-only grouped generation log feed. Returns one row per workflow_id with up to one result summary per render log.';
