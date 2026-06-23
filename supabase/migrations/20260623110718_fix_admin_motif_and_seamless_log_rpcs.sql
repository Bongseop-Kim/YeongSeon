COMMENT ON FUNCTION public.admin_update_order_tracking(uuid, text, text, text, text)
  IS 'Updates admin order tracking fields. SECURITY DEFINER is required because authenticated cannot directly UPDATE orders after REVOKE UPDATE; admin access is restricted by public.is_admin().';

COMMENT ON FUNCTION public.admin_get_motifs(text, text, text, integer, integer)
  IS 'Admin-only motif listing for SVG primitive review. SECURITY DEFINER is required because motifs has no authenticated SELECT grant; this function is the read boundary for the admin UI.';

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
  where (p_start_date is null or l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz)
    and (p_end_date is null or l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz)
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
