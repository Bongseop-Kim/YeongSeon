CREATE OR REPLACE FUNCTION public.admin_get_today_stats(
  p_order_type text,
  p_date text
)
RETURNS TABLE (
  today_order_count bigint,
  today_revenue numeric
)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*)::bigint AS today_order_count,
    COALESCE(SUM("totalPrice"), 0)::numeric AS today_revenue
  FROM public.admin_order_list_view
  WHERE date = p_date
    AND (
      p_order_type = 'all'
      OR "orderType" = p_order_type
    );
$$;
