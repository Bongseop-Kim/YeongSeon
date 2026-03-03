CREATE OR REPLACE FUNCTION public.admin_get_today_stats(
  p_order_type text,
  p_date text
)
RETURNS TABLE (
  today_order_count bigint,
  today_revenue numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS today_order_count,
    COALESCE(SUM("totalPrice"), 0)::numeric AS today_revenue
  FROM public.admin_order_list_view
  WHERE date = p_date
    AND (
      p_order_type = 'all'
      OR "orderType" = p_order_type
    );
end;
$$;
