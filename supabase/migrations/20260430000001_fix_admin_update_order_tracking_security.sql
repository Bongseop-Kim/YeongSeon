-- admin_update_order_tracking: SECURITY INVOKER → SECURITY DEFINER
-- SECURITY DEFINER 사용 근거:
--   스키마에서 authenticated 역할의 orders 테이블 직접 UPDATE가
--   REVOKE UPDATE ... FROM authenticated 로 제한되어 있다.
--   is_admin() 검증으로 관리자만 호출 가능하므로 SECURITY DEFINER가 적합하다.
CREATE OR REPLACE FUNCTION public.admin_update_order_tracking(
  p_order_id uuid,
  p_courier_company text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_tracking_number text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_tracking_number := nullif(trim(p_tracking_number), '');

  update public.orders
  set
    courier_company = nullif(trim(p_courier_company), ''),
    tracking_number = v_tracking_number,
    shipped_at = case
      when v_tracking_number is not null then coalesce(shipped_at, now())
      else shipped_at
    end
  where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$$;
