-- ── admin_get_period_stats (fix) ─────────────────────────────
-- p_start_date, p_end_date를 date 타입으로 변경하고,
-- 역순 범위 검증 추가, created_at 기반 필터링으로 인덱스 활용
CREATE OR REPLACE FUNCTION public.admin_get_period_stats(
  p_order_type  text,
  p_start_date  date,
  p_end_date    date
)
RETURNS TABLE (
  period_order_count bigint,
  period_revenue     numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_start_date is null then
    raise exception 'p_start_date is required';
  end if;

  if p_end_date is null then
    raise exception 'p_end_date is required';
  end if;

  if p_start_date > p_end_date then
    raise exception 'p_start_date must be <= p_end_date';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint                        AS period_order_count,
    COALESCE(SUM(total_price), 0)::numeric  AS period_revenue
  FROM public.orders
  WHERE created_at >= p_start_date
    AND created_at <  p_end_date + 1
    AND (
      p_order_type = 'all'
      OR order_type = p_order_type
    );
end;
$$;
