DROP FUNCTION IF EXISTS public.admin_get_motifs(text, text, text, integer, integer);

ALTER TABLE public.motifs
  DROP COLUMN IF EXISTS status;

CREATE OR REPLACE FUNCTION public.admin_get_motifs(
  p_source    text    DEFAULT NULL,
  p_id_search text    DEFAULT NULL,
  p_limit     integer DEFAULT 48,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE (
  id            text,
  symbol        text,
  color_slots   jsonb,
  bbox          jsonb,
  anchor        jsonb,
  subject       text,
  scope         text,
  view          text,
  expression    text,
  style         text,
  description   text,
  tags          text[],
  source        text,
  quality       real,
  variant_group text,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  p_limit := least(greatest(coalesce(p_limit, 48), 0), 200);
  p_offset := greatest(coalesce(p_offset, 0), 0);
  p_id_search := nullif(trim(coalesce(p_id_search, '')), '');

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    m.id,
    m.symbol,
    m.color_slots,
    m.bbox,
    m.anchor,
    m.subject,
    m.scope,
    m.view,
    m.expression,
    m.style,
    m.description,
    m.tags,
    m.source,
    m.quality,
    m.variant_group,
    m.created_at
  from public.motifs m
  where (p_source is null or m.source = p_source)
    and (
      p_id_search is null
      or m.id = p_id_search
      or m.id ilike ('%' || p_id_search || '%')
    )
  order by m.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

COMMENT ON FUNCTION public.admin_get_motifs(text, text, integer, integer)
  IS 'Admin-only motif listing for SVG primitives. SECURITY DEFINER is required because motifs has no authenticated SELECT grant; this function is the read boundary for the admin UI.';

GRANT EXECUTE ON FUNCTION public.admin_get_motifs(
  text, text, integer, integer
) TO authenticated;
