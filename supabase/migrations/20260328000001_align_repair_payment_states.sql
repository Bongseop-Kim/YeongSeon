-- repair 결제 후 상태/멱등 처리 정렬
CREATE OR REPLACE FUNCTION public.lock_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_locked_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_already_locked boolean := false;
  v_already_confirmed boolean := false;
begin
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for v_order in
    select id, user_id, status, order_type
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status = '대기중' then
      update public.orders
      set status = '결제중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '대기중', '결제중', 'payment lock'
      );
    elsif v_order.status = '결제중' then
      v_already_locked := true;
    elsif v_order.status in ('진행중', '발송대기', '접수', '완료') then
      v_already_confirmed := true;
    else
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_locked_orders := v_locked_orders || jsonb_build_object(
      'orderId', v_order.id,
      'orderType', v_order.order_type
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'orders', v_locked_orders,
    'already_locked', v_already_locked,
    'already_confirmed', v_already_confirmed
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.unlock_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_count int := 0;
begin
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for v_order in
    select id, user_id, status
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status = '결제중' then
      update public.orders
      set status = '대기중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '결제중', '대기중', 'payment unlock: approval failed'
      );
    elsif v_order.status = '대기중' then
      null;
    elsif v_order.status in ('진행중', '발송대기', '접수', '완료') then
      null;
    end if;
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  update public.user_coupons
  set status = 'active',
      updated_at = now()
  where user_id = p_user_id
    and status = 'reserved'
    and id in (
      select distinct oi.applied_user_coupon_id
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.payment_group_id = p_payment_group_id
        and oi.applied_user_coupon_id is not null
    );

  return jsonb_build_object('success', true);
end;
$$;
