-- create_claim: 완료된 클레임 후 동일 아이템 재신청 방지
-- 기존 중복 체크에 '완료' 상태가 누락되어 완료 후 재신청이 가능했던 버그 수정

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
-- SECURITY DEFINER: claims INSERT 시 order_status_logs에 접근 불필요하나
-- claims 테이블의 RLS가 소유자 외 INSERT를 차단하여 우회 목적으로 사용
SECURITY DEFINER
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
begin
  -- 1. Auth check
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- 2. Type validation
  if p_type not in ('cancel', 'return', 'exchange') then
    raise exception 'Invalid claim type';
  end if;

  -- 3. Reason validation
  if p_reason not in (
    'change_mind', 'defect', 'delay', 'wrong_item',
    'size_mismatch', 'color_mismatch', 'other'
  ) then
    raise exception 'Invalid claim reason';
  end if;

  -- 4. Order ownership check (FOR UPDATE: 취소 처리 중 동시 상태 변경 방지)
  select o.order_type, o.status
  into v_order_type, v_order_status
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- cancel 상태 가드
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

  -- 5. Order item lookup (p_item_id is order_items.item_id text)
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

  -- 6. Quantity validation
  v_claim_quantity := coalesce(p_quantity, v_order_item.quantity);
  if v_claim_quantity <= 0 or v_claim_quantity > v_order_item.quantity then
    raise exception 'Invalid claim quantity';
  end if;

  -- 7. Duplicate claim pre-check (final race-safety enforced by unique index)
  -- '완료' 포함: 완료된 클레임 후 동일 아이템 재신청 방지
  if exists (
    select 1
    from public.claims
    where order_item_id = v_order_item.id
      and type = p_type
      and status in ('접수', '처리중', '수거요청', '수거완료', '재발송', '완료')
  ) then
    raise exception 'Active claim already exists for this item';
  end if;

  -- 8. Generate claim number
  v_claim_number := public.generate_claim_number();

  -- 9. Insert claim (atomic conflict handling via partial unique index)
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
  on conflict (order_item_id, type) where (status in ('접수', '처리중', '수거요청', '수거완료', '재발송'))
  do nothing
  returning id into v_claim_id;

  if v_claim_id is null then
    raise exception 'Active claim already exists for this item';
  end if;

  return jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_number', v_claim_number
  );
end;
$$;
