CREATE OR REPLACE FUNCTION public.confirm_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid,
  p_payment_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- order_status_logs INSERT에 일반 유저 RLS 없음
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_post_status text;
  v_updated_orders jsonb := '[]'::jsonb;
  v_count int := 0;
begin
  for v_order in
    select id, user_id, status, order_type
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    if v_order.user_id <> p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status not in ('대기중', 'pending', 'created') then
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_post_status := case v_order.order_type
      when 'sale' then '진행중'
      else '접수'
    end;

    update public.orders
    set status = v_post_status, updated_at = now()
    where id = v_order.id;

    insert into public.order_status_logs (
      order_id, changed_by, previous_status, new_status, memo
    ) values (
      v_order.id, p_user_id, v_order.status, v_post_status,
      'payment confirmed: ' || p_payment_key
    );

    v_updated_orders := v_updated_orders || jsonb_build_object(
      'orderId', v_order.id,
      'orderType', v_order.order_type
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'orders', v_updated_orders
  );
end;
$$;
