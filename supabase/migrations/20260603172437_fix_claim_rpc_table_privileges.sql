GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT SELECT, INSERT ON TABLE public.claims TO authenticated;

CREATE OR REPLACE FUNCTION public.create_claim(
  p_type text,
  p_order_id uuid,
  p_item_id text,
  p_reason text,
  p_description text DEFAULT NULL,
  p_quantity integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order_type text;
  v_order_status text;
  v_order_item record;
  v_claim_quantity integer;
  v_claim_number text;
  v_claim_id uuid;
  v_constraint_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_type not in ('cancel', 'return', 'exchange') then
    raise exception 'Invalid claim type';
  end if;

  if p_reason not in (
    'change_mind', 'defect', 'delay', 'wrong_item',
    'size_mismatch', 'color_mismatch', 'other'
  ) then
    raise exception 'Invalid claim reason';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_order_id::text, 0));

  select o.order_type, o.status
  into v_order_type, v_order_status
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if p_type = 'cancel' then
    if not (
      (v_order_type = 'sale'   and v_order_status in ('대기중', '결제중', '진행중'))
      or (v_order_type = 'custom' and v_order_status in ('대기중', '결제중', '접수'))
      or (v_order_type = 'repair' and v_order_status in ('대기중', '결제중'))
      or (v_order_type = 'sample' and v_order_status in ('대기중', '결제중', '접수'))
      or (v_order_type = 'token' and v_order_status in ('대기중'))
    ) then
      raise exception '현재 주문 상태에서는 취소할 수 없습니다';
    end if;
  end if;

  if p_type in ('return', 'exchange') then
    if not (
      v_order_status in ('배송중', '배송완료')
      and v_order_type in ('sale', 'repair', 'custom')
    ) then
      raise exception '현재 주문 상태에서는 반품/교환할 수 없습니다';
    end if;
  end if;

  begin
    select oi.id, oi.quantity
    into strict v_order_item
    from public.order_items oi
    where oi.item_id = p_item_id
      and oi.order_id = p_order_id;
  exception
    when no_data_found then
      raise exception 'Order item not found';
    when too_many_rows then
      raise exception 'Multiple order items found for given order_id and item_id';
  end;

  v_claim_quantity := coalesce(p_quantity, v_order_item.quantity);
  if v_claim_quantity <= 0 or v_claim_quantity > v_order_item.quantity then
    raise exception 'Invalid claim quantity';
  end if;

  v_claim_number := public.generate_claim_number();

  if exists (
    select 1
    from public.claims c
    where c.order_id = p_order_id
      and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception 'Active claim already exists for this order';
  end if;

  begin
    insert into public.claims (
      user_id,
      order_id,
      order_item_id,
      claim_number,
      type,
      reason,
      description,
      quantity
    )
    values (
      v_user_id,
      p_order_id,
      v_order_item.id,
      v_claim_number,
      p_type,
      p_reason,
      p_description,
      v_claim_quantity
    )
    on conflict (order_item_id, type) where (status in ('접수', '처리중', '수거요청', '수거완료', '재발송', '완료'))
    do nothing
    returning id into v_claim_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if v_constraint_name = 'idx_claims_single_active_per_order' then
        raise exception 'Active claim already exists for this order';
      end if;

      raise;
  end;

  if v_claim_id is null then
    raise exception 'Claim already exists for this item and type';
  end if;

  return jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_number', v_claim_number
  );
end;
$$;
