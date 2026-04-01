-- fix: 주문당 활성 클레임 1건만 허용하는 DB 제약 추가
--
-- 목적: 같은 주문(order_id)에 대해 활성 상태 클레임이 2건 이상 동시에 존재하지 않도록 강제한다.
-- 활성 상태 범위: '접수', '처리중', '수거요청', '수거완료', '재발송'
-- 제외 상태: '완료', '거부'

-- 1. 신규 partial unique index 생성 전 기존 중복 데이터 사전 검증
--    중복이 존재하면 마이그레이션을 즉시 중단하고 진단 정보를 제공한다.
do $$
declare
  v_dup_count int;
begin
  select count(*)
  into v_dup_count
  from (
    select order_id
    from public.claims
    where status = any(array['접수','처리중','수거요청','수거완료','재발송'])
    group by order_id
    having count(*) > 1
  ) dups;

  if v_dup_count > 0 then
    raise exception
      'MIGRATION BLOCKED: idx_claims_single_active_per_order 생성 불가 — public.claims에 % 건의 중복 주문(order_id)이 존재합니다. 활성 클레임을 수동 정리한 뒤 재실행하세요.',
      v_dup_count;
  end if;
end $$;

-- 2. 주문당 활성 클레임 1건 제약 인덱스 생성
CREATE UNIQUE INDEX idx_claims_single_active_per_order
  ON public.claims USING btree (order_id)
  WHERE status = ANY (ARRAY['접수','처리중','수거요청','수거완료','재발송']);

-- 3. create_claim에 사용자 친화적인 주문 단위 활성 클레임 가드 추가
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

  select o.order_type, o.status
  into v_order_type, v_order_status
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if p_type = 'cancel' then
    if not (
      (v_order_type = 'sale' and v_order_status in ('대기중', '결제중', '진행중'))
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

-- 5. admin_update_claim_status에 비활성→활성 전이 시 주문 단위 락 추가
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
  end if;

  if p_is_rollback then
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
    end if;

    if v_current_status = '거부' and p_new_status = '접수' then
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
      raise exception 'Invalid rollback from "%" to "%" for token_refund claim', v_current_status, p_new_status;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  else
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
      if not (
        (v_current_status = '접수' and p_new_status = '거부')
      ) then
        raise exception 'Invalid transition from "%" to "%" for token_refund claim', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  end if;

  update public.claims
  set status = p_new_status
  where id = p_claim_id;

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

-- 4. admin_update_order_status에 활성 클레임 주문 상태 변경 차단 가드 추가
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text DEFAULT NULL::text,
  p_payment_key text DEFAULT NULL::text,
  p_is_rollback boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid := auth.uid();
  v_current_status text;
  v_order_type text;
  v_payment_key text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select status, order_type, payment_key
  into v_current_status, v_order_type, v_payment_key
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  if exists (
    select 1
    from public.claims c
    where c.order_id = p_order_id
      and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception '활성 클레임이 있는 주문은 주문 상태를 직접 변경할 수 없습니다';
  end if;

  if p_new_status is null or btrim(p_new_status) = '' then
    raise exception 'p_new_status is required';
  end if;

  if p_is_rollback and (p_memo is null or btrim(p_memo) = '') then
    raise exception '롤백 시 사유 입력 필수';
  end if;

  if p_is_rollback then
    if v_current_status in ('배송중', '배송완료', '완료', '취소', '수거완료', '재발송') then
      raise exception 'Rollback not allowed from status: %', v_current_status;
    end if;

    if v_order_type = 'sale' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '진행중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '결제중'   and p_new_status = '대기중')
        or (v_current_status = '접수'   and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
        or (v_current_status = '제작완료' and p_new_status = '제작중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '접수' and p_new_status = '발송중')
        or (v_current_status = '수선중' and p_new_status = '접수')
        or (v_current_status = '수선완료' and p_new_status = '수선중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  else
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '진행중')
        or (v_current_status = '진행중'   and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'   and p_new_status = '제작중')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '접수' and p_new_status = '제작중')
        or (v_current_status = '제작중' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '발송중' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '발송대기', '발송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      if not (
        p_new_status = '취소' and v_current_status in ('대기중', '결제중')
      ) then
        raise exception 'Invalid transition from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  end if;

  update public.orders
  set status = p_new_status,
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_admin_id, v_current_status, p_new_status, p_memo
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;
