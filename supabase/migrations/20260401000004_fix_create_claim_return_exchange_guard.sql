-- fix: create_claim return/exchange 상태 가드 추가 및 pre-check 제거
--
-- 문제 1: create_claim이 cancel 타입만 주문 상태를 검증하고,
--         return/exchange 타입은 어떤 주문 상태에서도 진입 가능했음.
--         BR-claim-007에 따라 반품/교환은 배송중/배송완료에서만 허용.
-- 문제 2: 중복 클레임 pre-check(SELECT EXISTS)가 race condition을 완전히 막지 못함.
--         atomic INSERT ... ON CONFLICT ... DO NOTHING + v_claim_id IS NULL 체크로 단일화.
--
-- 추가: idx_claims_active_per_item 재생성 시 기존 중복 데이터 사전 검증 포함.
--       (20260401000003이 이미 배포된 환경을 위한 idempotent 후속 마이그레이션)

-- 1. idx_claims_active_per_item 재생성 전 중복 데이터 사전 검증
--    중복이 존재하면 마이그레이션을 즉시 중단하고 진단 정보를 제공한다.
do $$
declare
  v_dup_count int;
begin
  select count(*)
  into v_dup_count
  from (
    select order_item_id, type
    from public.claims
    where status = any(array['접수','처리중','수거요청','수거완료','재발송','완료'])
    group by order_item_id, type
    having count(*) > 1
  ) dups;

  if v_dup_count > 0 then
    raise exception
      'MIGRATION BLOCKED: idx_claims_active_per_item 생성 불가 — public.claims에 % 건의 중복 행(order_item_id, type)이 존재합니다. 수동으로 정리한 뒤 재실행하세요.',
      v_dup_count;
  end if;
end $$;

-- 2. 인덱스 재생성 (idempotent: IF EXISTS 사용)
DROP INDEX IF EXISTS public.idx_claims_active_per_item;

CREATE UNIQUE INDEX idx_claims_active_per_item
  ON public.claims USING btree (order_item_id, type)
  WHERE status = ANY (ARRAY['접수','처리중','수거요청','수거완료','재발송','완료']);

-- 3. create_claim: return/exchange 상태 가드 추가 + pre-check 제거
--    (ON CONFLICT ... DO NOTHING + v_claim_id IS NULL이 단일 진실 소스)
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
-- SECURITY DEFINER: claims 테이블의 RLS가 소유자 외 INSERT를 차단하여 우회 목적으로 사용
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

  -- 4. Order ownership check (FOR UPDATE: 처리 중 동시 상태 변경 방지)
  select o.order_type, o.status
  into v_order_type, v_order_status
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- 5. 상태 가드: cancel (BR-claim-002, BR-claim-003, BR-claim-004)
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

  -- 6. 상태 가드: return/exchange (BR-claim-007: 배송중/배송완료에서만 허용)
  if p_type in ('return', 'exchange') then
    if not (
      v_order_status in ('배송중', '배송완료')
      and v_order_type in ('sale', 'repair', 'custom')
    ) then
      raise exception '현재 주문 상태에서는 반품/교환할 수 없습니다';
    end if;
  end if;

  -- 7. Order item lookup (p_item_id is order_items.item_id text)
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

  -- 8. Quantity validation
  v_claim_quantity := coalesce(p_quantity, v_order_item.quantity);
  if v_claim_quantity <= 0 or v_claim_quantity > v_order_item.quantity then
    raise exception 'Invalid claim quantity';
  end if;

  -- 9. Generate claim number
  v_claim_number := public.generate_claim_number();

  -- 10. Insert claim
  --     중복 감지는 partial unique index(idx_claims_active_per_item)와
  --     ON CONFLICT ... DO NOTHING + v_claim_id IS NULL 체크로 원자적으로 처리한다.
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

  if v_claim_id is null then
    raise exception 'Active claim already exists for this item';
  end if;

  return jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_number', v_claim_number
  );
end;
$$;
