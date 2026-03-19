-- =============================================================
-- 20260324000000_order_actions_helpers.sql
-- HATEOAS action helpers + 버그 수정 + 구 샘플 상태 제거
-- =============================================================

-- ── 1. get_order_admin_actions 헬퍼 함수 ──────────────────────
CREATE OR REPLACE FUNCTION public.get_order_admin_actions(
  p_order_type text,
  p_status     text
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_status IN ('완료', '취소', '실패') THEN ARRAY[]::text[]

    WHEN p_order_type = 'sale' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '진행중'   THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'custom' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '제작완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'sample' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'repair' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback']
      WHEN '수선중'   THEN ARRAY['advance', 'rollback']
      WHEN '수선완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'token' THEN CASE p_status
      WHEN '대기중' THEN ARRAY['advance', 'cancel']
      WHEN '결제중' THEN ARRAY['rollback', 'cancel']
      ELSE ARRAY[]::text[]
    END

    ELSE ARRAY[]::text[]
  END;
$$;

-- ── 2. get_order_customer_actions 헬퍼 함수 ───────────────────
CREATE OR REPLACE FUNCTION public.get_order_customer_actions(
  p_order_type text,
  p_status     text,
  p_order_id   uuid DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
declare
  v_actions          text[] := ARRAY[]::text[];
  v_has_active_claim boolean := false;
begin
  IF (p_order_type = 'sale'   AND p_status IN ('대기중', '진행중'))
  OR (p_order_type = 'custom' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'sample' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'repair' AND p_status = '대기중')
  OR (p_order_type = 'token'  AND p_status = '대기중')
  THEN
    v_actions := v_actions || ARRAY['claim_cancel'];
  END IF;

  IF p_order_type = 'sale' AND p_status IN ('배송중', '배송완료', '완료') THEN
    v_actions := v_actions || ARRAY['claim_return', 'claim_exchange'];
  END IF;

  IF p_order_type <> 'token' AND p_status IN ('배송중', '배송완료') THEN
    IF p_order_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.order_id = p_order_id
          AND c.status IN ('접수', '처리중', '수거요청', '수거완료', '재발송')
      ) INTO v_has_active_claim;

      IF NOT v_has_active_claim THEN
        v_actions := v_actions || ARRAY['confirm_purchase'];
      END IF;
    ELSE
      v_actions := v_actions || ARRAY['confirm_purchase'];
    END IF;
  END IF;

  RETURN v_actions;
end;
$$;

-- ── 3. 버그 수정: create_claim cancel 가드 ────────────────────
-- custom: 구 샘플 상태 제거. repair: 접수 제거. sample 타입 명시 추가.
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

  if exists (
    select 1
    from public.claims
    where order_item_id = v_order_item.id
      and type = p_type
      and status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception 'Active claim already exists for this item';
  end if;

  v_claim_number := public.generate_claim_number();

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

-- ── 4. 버그 수정: admin_update_order_status repair cancel 가드 ─
-- repair: 접수 상태에서 취소 불가 (BR-repair-005 준수)
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
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
  v_admin_id       uuid;
  v_current_status text;
  v_order_type     text;
  v_total_price    integer;
  v_user_id        uuid;
  v_token_amount   integer;
  v_plan_key       text;
  v_plan_label     text;
  v_payment_key    text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select o.status, o.order_type, o.total_price, o.user_id, o.payment_key
  into v_current_status, v_order_type, v_total_price, v_user_id, v_payment_key
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if p_is_rollback then
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
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
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
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
        (v_current_status = '대기중' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '제작중')
        or (v_current_status = '제작중' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'     and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      if not (
        (v_current_status = '대기중' and p_new_status = '완료' and v_payment_key is not null and length(btrim(v_payment_key)) > 0)
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  end if;

  if p_new_status = '배송중' then
    update public.orders
    set status = p_new_status,
        shipped_at = coalesce(shipped_at, now())
    where id = p_order_id;

  elsif p_new_status = '배송완료' then
    update public.orders
    set status = p_new_status,
        delivered_at = now()
    where id = p_order_id;

  elsif p_new_status = '완료' then
    if v_order_type = 'token' then
      if not exists (select 1 from public.design_tokens where work_id = 'order_' || p_order_id::text) then
        select (oi.item_data->>'token_amount')::integer, oi.item_data->>'plan_key'
        into v_token_amount, v_plan_key
        from public.order_items oi
        where oi.order_id = p_order_id and oi.item_type = 'token'
        limit 1;

        if v_token_amount is null or v_token_amount <= 0 then
          raise exception 'token order % has no valid token item (token_amount: %)', p_order_id, v_token_amount;
        end if;

        v_plan_label := case v_plan_key
          when 'starter' then 'Starter'
          when 'popular' then 'Popular'
          when 'pro'     then 'Pro'
          else coalesce(v_plan_key, '구매')
        end;
      end if;
    end if;

    update public.orders
    set status       = p_new_status,
        confirmed_at = now()
    where id = p_order_id;

    if v_order_type = 'token' then
      insert into public.design_tokens (user_id, amount, type, description, work_id)
      values (
        v_user_id,
        v_token_amount,
        'purchase',
        '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개, 관리자 확정)',
        'order_' || p_order_id::text
      )
      on conflict (work_id) do nothing;
    end if;

  else
    update public.orders
    set status = p_new_status
    where id = p_order_id;
  end if;

  insert into public.order_status_logs (
    order_id,
    changed_by,
    previous_status,
    new_status,
    memo,
    is_rollback
  )
  values (
    p_order_id,
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

-- ── 5. order_list_view: customerActions 추가 ──────────────────
CREATE OR REPLACE VIEW public.order_list_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number  AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price   AS "totalPrice",
  o.order_type    AS "orderType",
  o.created_at,
  public.get_order_customer_actions(o.order_type, o.status) AS "customerActions"
FROM public.orders o
WHERE o.user_id = auth.uid();

-- ── 6. order_detail_view: customerActions 추가 ────────────────
CREATE OR REPLACE VIEW public.order_detail_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number    AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price     AS "totalPrice",
  o.order_type      AS "orderType",
  o.courier_company AS "courierCompany",
  o.tracking_number AS "trackingNumber",
  o.shipped_at      AS "shippedAt",
  o.delivered_at    AS "deliveredAt",
  o.confirmed_at    AS "confirmedAt",
  o.created_at,
  sa.recipient_name   AS "recipientName",
  sa.recipient_phone  AS "recipientPhone",
  sa.address          AS "shippingAddress",
  sa.address_detail   AS "shippingAddressDetail",
  sa.postal_code      AS "shippingPostalCode",
  sa.delivery_memo    AS "deliveryMemo",
  sa.delivery_request AS "deliveryRequest",
  public.get_order_customer_actions(o.order_type, o.status, o.id) AS "customerActions"
FROM public.orders o
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
WHERE o.user_id = auth.uid();

-- ── 7. admin_order_detail_view: adminActions 추가 ─────────────
CREATE OR REPLACE VIEW public.admin_order_detail_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.user_id        AS "userId",
  o.order_number   AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.order_type     AS "orderType",
  o.status,
  o.total_price    AS "totalPrice",
  o.original_price AS "originalPrice",
  o.total_discount AS "totalDiscount",
  o.courier_company  AS "courierCompany",
  o.tracking_number  AS "trackingNumber",
  o.shipped_at       AS "shippedAt",
  o.delivered_at     AS "deliveredAt",
  o.confirmed_at     AS "confirmedAt",
  o.created_at,
  o.updated_at,
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  public.admin_get_email(o.user_id) AS "customerEmail",
  sa.recipient_name   AS "recipientName",
  sa.recipient_phone  AS "recipientPhone",
  sa.address          AS "shippingAddress",
  sa.address_detail   AS "shippingAddressDetail",
  sa.postal_code      AS "shippingPostalCode",
  sa.delivery_memo    AS "deliveryMemo",
  sa.delivery_request AS "deliveryRequest",
  o.payment_group_id  AS "paymentGroupId",
  o.shipping_cost     AS "shippingCost",
  o.sample_cost    AS "sampleCost",
  public.get_order_admin_actions(o.order_type, o.status) AS "adminActions"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id;

-- ── 8. 구 샘플 상태 CHECK 제약 업데이트 ──────────────────────
-- 사전에 구 상태값을 가진 레코드가 없음을 확인한 후 실행해야 한다.
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    '대기중','결제중','진행중','배송중','배송완료','완료','취소','실패',
    '접수','제작중','제작완료',
    '수선중','수선완료'
  ]));
