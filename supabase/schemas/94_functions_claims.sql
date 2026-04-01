-- ============================================================= 
-- 94_functions_claims.sql  – Claim RPC functions 
-- =============================================================
-- ── create_claim ─────────────────────────────────────────────
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

  -- 10. 주문 단위 활성 클레임 가드
  --     최종 진실 소스는 partial unique index(idx_claims_single_active_per_order)이며,
  --     이 가드는 사용자 친화적인 오류 메시지를 위한 보조 장치다.
  if exists (
    select 1
    from public.claims c
    where c.order_id = p_order_id
      and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception 'Active claim already exists for this order';
  end if;

  -- 11. Insert claim
  --     중복 감지는 partial unique index(idx_claims_active_per_item)와
  --     ON CONFLICT ... DO NOTHING + v_claim_id IS NULL 체크로 원자적으로 처리한다.
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

-- ── admin_update_claim_status ─────────────────────────────────
-- SECURITY DEFINER 사용 근거:
-- - admin_update_claim_status는 관리자 전용 RPC이며, claims/orders 행을 FOR UPDATE로 잠그고
--   claims UPDATE 및 claim_status_logs INSERT를 수행한다.
-- - 이 쓰기 경로는 authenticated 역할에 직접 열려 있지 않은 RLS 보호 자원에 대한
--   admin-only 변경과 감사 로그 작성을 포함하므로 SECURITY INVOKER 기본값으로는 처리할 수 없다.
-- - 따라서 저장소 기본 규칙인 "SECURITY INVOKER를 기본으로, audit log 또는 admin-only update처럼
--   RLS 우회가 필요한 특수 목적에만 SECURITY DEFINER 사용"에 따라 예외를 명시적으로 선택한다.
CREATE OR REPLACE FUNCTION public.admin_update_claim_status(
  p_claim_id uuid,
  p_new_status text,
  p_memo text DEFAULT NULL,
  p_is_rollback boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_current_status text;
  v_claim_type text;
  v_order_id uuid;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status + claim type + order id
  select c.status, c.type, c.order_id
  into v_current_status, v_claim_type, v_order_id
  from public.claims c
  where c.id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if v_current_status not in ('접수', '처리중', '수거요청', '수거완료', '재발송')
     and p_new_status in ('접수', '처리중', '수거요청', '수거완료', '재발송') then
    perform 1
    from public.orders
    where id = v_order_id
    for update;

    if not found then
      raise exception 'Order not found';
    end if;

    perform 1
    from public.claims
    where order_id = v_order_id
      and id <> p_claim_id
      and status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
    for update;

    if found then
      raise exception 'Active claim already exists for this order';
    end if;
  end if;

  if p_is_rollback then
    -- Rollback requires memo
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
    end if;

    -- Validate rollback transition by claim type
    -- Special: 거부 → 접수 allowed for all types (오거부 복원)
    if v_current_status = '거부' and p_new_status = '접수' then
      -- allowed for all claim types
      null;
    elsif v_claim_type = 'cancel' then
      if not (v_current_status = '처리중' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for cancel claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'return' then
      if not (v_current_status = '수거요청' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for return claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'exchange' then
      if not (v_current_status = '수거요청' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for exchange claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'token_refund' then
      -- token_refund 롤백: 거부→접수는 공통 로직(위)에서 허용, 나머지 롤백 불가
      raise exception 'Invalid rollback from "%" to "%" for token_refund claim', v_current_status, p_new_status;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  else
    -- Validate forward state transition by claim type
    if v_claim_type = 'cancel' then
      if not (
        (v_current_status = '접수' and p_new_status = '처리중')
        or (v_current_status = '처리중' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '처리중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for cancel claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'return' then
      if not (
        (v_current_status = '접수' and p_new_status = '수거요청')
        or (v_current_status = '수거요청' and p_new_status = '수거완료')
        or (v_current_status = '수거완료' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for return claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'exchange' then
      if not (
        (v_current_status = '접수' and p_new_status = '수거요청')
        or (v_current_status = '수거요청' and p_new_status = '수거완료')
        or (v_current_status = '수거완료' and p_new_status = '재발송')
        or (v_current_status = '재발송' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료', '재발송'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for exchange claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'token_refund' then
      -- token_refund 완료 처리는 approve_token_refund() 전용 (Edge Function 경유 필수)
      -- 이 RPC에서 완료를 허용하면 design_tokens/orders 부수효과가 누락된다.
      if not (
        (v_current_status = '접수' and p_new_status = '거부')
      ) then
        raise exception 'Invalid transition from "%" to "%" for token_refund claim', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  end if;

  -- Update claim status
  update public.claims
  set status = p_new_status
  where id = p_claim_id;

  -- Insert status log
  insert into public.claim_status_logs (
    claim_id,
    changed_by,
    previous_status,
    new_status,
    memo,
    is_rollback
  )
  values (
    p_claim_id,
    v_admin_id,
    v_current_status,
    p_new_status,
    p_memo,
    p_is_rollback
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;

-- cancel_claim: 접수 상태의 클레임을 유저가 직접 취소(삭제)한다.
CREATE OR REPLACE FUNCTION public.cancel_claim(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
-- SECURITY DEFINER: claims 테이블에 authenticated 역할의 DELETE RLS 정책이
-- 의도적으로 존재하지 않는다. 직접 DELETE를 허용하면 상태 검증 없이
-- 레코드가 삭제될 수 있으므로, 이 함수를 통해서만 소유권·상태 검증 후
-- 삭제를 허용한다. DELETE RLS 정책을 추가하더라도 이 함수를 유지한다.
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_status  text;
  v_type    text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select status, type into v_status, v_type
  from public.claims
  where id = p_claim_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  -- token_refund는 create_claim으로 생성되지 않으며 별도 환불 흐름으로 관리된다.
  if v_type = 'token_refund' then
    raise exception 'token_refund 클레임은 직접 취소할 수 없습니다';
  end if;

  if v_status <> '접수' then
    raise exception '접수 상태에서만 클레임을 취소할 수 있습니다';
  end if;

  delete from public.claims where id = p_claim_id;
  -- claim_status_logs는 ON DELETE CASCADE로 자동 삭제
end;
$$;
