-- ── admin_get_period_stats ───────────────────────────────────
-- 기간 범위(start~end)의 주문 수와 매출 합계를 집계한다.
-- admin_get_today_stats 는 단일 날짜 전용으로 유지하고,
-- 날짜 범위 조회는 이 함수를 사용한다.
CREATE OR REPLACE FUNCTION public.admin_get_period_stats(
  p_order_type text,
  p_start_date text,
  p_end_date text
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

  if p_start_date is null or p_start_date = '' then
    raise exception 'p_start_date is required';
  end if;

  if p_end_date is null or p_end_date = '' then
    raise exception 'p_end_date is required';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint                        AS period_order_count,
    COALESCE(SUM("totalPrice"), 0)::numeric AS period_revenue
  FROM public.admin_order_list_view
  WHERE date >= p_start_date
    AND date <= p_end_date
    AND (
      p_order_type = 'all'
      OR "orderType" = p_order_type
    );
end;
$$;
