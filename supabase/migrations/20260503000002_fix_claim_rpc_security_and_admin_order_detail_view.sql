-- fix: create_claim 보안 컨텍스트 / admin_update_claim_status 활성 클레임 가드 / admin_order_detail_view camelCase 컬럼 정합성

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

-- SECURITY DEFINER 사용 근거:
-- - admin_update_claim_status는 관리자 전용 RPC이며, claims/orders 행을 FOR UPDATE로 잠그고
--   claims UPDATE 및 claim_status_logs INSERT를 수행한다.
-- - 이 쓰기 경로는 authenticated 역할에 직접 열려 있지 않은 RLS 보호 자원에 대한
--   admin-only 변경과 감사 로그 작성을 포함하므로 SECURITY INVOKER 기본값으로는 처리할 수 없다.
-- - 따라서 저장소 기본 규칙인 "SECURITY INVOKER를 기본으로, audit log 또는 admin-only update처럼
--   RLS 우회가 필요한 특수 목적에만 SECURITY DEFINER 사용"에 따라 admin_update_claim_status에
--   SECURITY DEFINER를 의도적으로 유지한다.
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

DROP VIEW public.admin_order_detail_view;

CREATE VIEW public.admin_order_detail_view
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
  o.courier_company         AS "courierCompany",
  o.tracking_number         AS "trackingNumber",
  o.shipped_at              AS "shippedAt",
  o.delivered_at            AS "deliveredAt",
  o.confirmed_at            AS "confirmedAt",
  o.company_courier_company AS "companyCourierCompany",
  o.company_tracking_number AS "companyTrackingNumber",
  o.company_shipped_at      AS "companyShippedAt",
  o.created_at              AS "createdAt",
  o.updated_at              AS "updatedAt",
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
  ac.id               AS "activeClaimId",
  ac.claim_number     AS "activeClaimNumber",
  ac.type             AS "activeClaimType",
  ac.status           AS "activeClaimStatus",
  ac.quantity         AS "activeClaimQuantity",
  o.payment_group_id  AS "paymentGroupId",
  o.shipping_cost     AS "shippingCost",
  public.get_order_admin_actions(o.order_type, o.status) AS "adminActions"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
LEFT JOIN LATERAL (
  SELECT
    cl.id,
    cl.claim_number,
    cl.type,
    cl.status,
    cl.quantity
  FROM public.claims cl
  WHERE cl.order_id = o.id
    AND cl.status IN ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ORDER BY cl.created_at DESC, cl.id DESC
  LIMIT 1
) ac ON true;
