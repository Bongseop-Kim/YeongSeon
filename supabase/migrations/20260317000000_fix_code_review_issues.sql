-- =============================================================
-- 20260317000000_fix_code_review_issues.sql
-- 코드 리뷰 지적사항 수정:
--   A. calculate_custom_order_amounts: SECURITY DEFINER → INVOKER + tie_type/interlining 유효값 검증
--   B. points 테이블: order_id+type 기준 partial unique index 추가
--   C. confirm_payment_orders: design_tokens/points IF NOT EXISTS → ON CONFLICT DO NOTHING
--   D. admin_update_order_status: design_tokens ON CONFLICT + points ON CONFLICT 멱등 처리
--   E. admin_update_order_status: anon role EXECUTE 권한 회수
-- =============================================================

-- ── A. calculate_custom_order_amounts: SECURITY INVOKER + 유효값 검증 ──
-- pricing 테이블 읽기만 수행하므로 SECURITY DEFINER 불필요.
-- 이전 migration(20260316000000)에서 SECURITY DEFINER로 정의된 것을 INVOKER로 수정.
CREATE OR REPLACE FUNCTION public.calculate_custom_order_amounts(
  p_options jsonb,
  p_quantity integer,
  p_sample boolean DEFAULT false,
  p_sample_type text DEFAULT null
)
RETURNS TABLE (sewing_cost integer, fabric_cost integer, sample_cost integer, total_cost integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_start_cost integer;
  v_sewing_per_cost integer;
  v_auto_tie_cost integer;
  v_triangle_stitch_cost integer;
  v_side_stitch_cost integer;
  v_bar_tack_cost integer;
  v_dimple_cost integer;
  v_spoderato_cost integer;
  v_fold7_cost integer;
  v_wool_interlining_cost integer;
  v_brand_label_cost integer;
  v_care_label_cost integer;
  v_yarn_dyed_design_cost integer;

  v_tie_type text;
  v_interlining text;
  v_design_type text;
  v_fabric_type text;
  v_fabric_provided boolean;

  v_triangle_stitch boolean;
  v_side_stitch boolean;
  v_bar_tack boolean;
  v_dimple boolean;
  v_spoderato boolean;
  v_fold7 boolean;
  v_brand_label boolean;
  v_care_label boolean;

  v_sewing_per_unit integer;
  v_unit_fabric_cost integer;
  v_fabric_amount integer;
begin
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if p_sample and (p_sample_type is null or trim(p_sample_type) = '') then
    raise exception 'p_sample_type is required when p_sample is true';
  end if;

  if p_sample and p_sample_type not in ('fabric', 'sewing', 'fabric_and_sewing') then
    raise exception 'Invalid p_sample_type: %', p_sample_type;
  end if;

  select
    max(case when key = 'START_COST' then amount end),
    max(case when key = 'SEWING_PER_COST' then amount end),
    max(case when key = 'AUTO_TIE_COST' then amount end),
    max(case when key = 'TRIANGLE_STITCH_COST' then amount end),
    max(case when key = 'SIDE_STITCH_COST' then amount end),
    max(case when key = 'BAR_TACK_COST' then amount end),
    max(case when key = 'DIMPLE_COST' then amount end),
    max(case when key = 'SPODERATO_COST' then amount end),
    max(case when key = 'FOLD7_COST' then amount end),
    max(case when key = 'WOOL_INTERLINING_COST' then amount end),
    max(case when key = 'BRAND_LABEL_COST' then amount end),
    max(case when key = 'CARE_LABEL_COST' then amount end),
    max(case when key = 'YARN_DYED_DESIGN_COST' then amount end)
  into
    v_start_cost,
    v_sewing_per_cost,
    v_auto_tie_cost,
    v_triangle_stitch_cost,
    v_side_stitch_cost,
    v_bar_tack_cost,
    v_dimple_cost,
    v_spoderato_cost,
    v_fold7_cost,
    v_wool_interlining_cost,
    v_brand_label_cost,
    v_care_label_cost,
    v_yarn_dyed_design_cost
  from public.custom_order_pricing_constants
  where key = any (array[
    'START_COST',
    'SEWING_PER_COST',
    'AUTO_TIE_COST',
    'TRIANGLE_STITCH_COST',
    'SIDE_STITCH_COST',
    'BAR_TACK_COST',
    'DIMPLE_COST',
    'SPODERATO_COST',
    'FOLD7_COST',
    'WOOL_INTERLINING_COST',
    'BRAND_LABEL_COST',
    'CARE_LABEL_COST',
    'YARN_DYED_DESIGN_COST'
  ]);

  if v_start_cost is null
    or v_sewing_per_cost is null
    or v_auto_tie_cost is null
    or v_triangle_stitch_cost is null
    or v_side_stitch_cost is null
    or v_bar_tack_cost is null
    or v_dimple_cost is null
    or v_spoderato_cost is null
    or v_fold7_cost is null
    or v_wool_interlining_cost is null
    or v_brand_label_cost is null
    or v_care_label_cost is null
    or v_yarn_dyed_design_cost is null then
    raise exception 'Custom order pricing constants are not configured';
  end if;

  v_tie_type := coalesce(p_options->>'tie_type', '');
  v_interlining := coalesce(p_options->>'interlining', '');
  v_design_type := nullif(p_options->>'design_type', '');
  v_fabric_type := nullif(p_options->>'fabric_type', '');
  v_fabric_provided := coalesce((p_options->>'fabric_provided')::boolean, false);

  -- tie_type/interlining 유효값 검증: 미지 값은 조용히 기본처리되지 않고 예외 발생
  if v_tie_type != '' and v_tie_type != 'AUTO' then
    raise exception 'Invalid tie_type: %. Allowed values are empty string or AUTO', v_tie_type;
  end if;
  if v_interlining != '' and v_interlining != 'WOOL' then
    raise exception 'Invalid interlining: %. Allowed values are empty string or WOOL', v_interlining;
  end if;

  v_triangle_stitch := coalesce((p_options->>'triangle_stitch')::boolean, false);
  v_side_stitch := coalesce((p_options->>'side_stitch')::boolean, false);
  v_bar_tack := coalesce((p_options->>'bar_tack')::boolean, false);
  v_dimple := coalesce((p_options->>'dimple')::boolean, false);
  v_spoderato := coalesce((p_options->>'spoderato')::boolean, false);
  v_fold7 := coalesce((p_options->>'fold7')::boolean, false);
  v_brand_label := coalesce((p_options->>'brand_label')::boolean, false);
  v_care_label := coalesce((p_options->>'care_label')::boolean, false);

  if v_dimple and v_tie_type != 'AUTO' then
    raise exception '딤플은 자동 봉제(AUTO)에서만 선택 가능합니다';
  end if;

  v_sewing_per_unit := v_sewing_per_cost;

  if v_tie_type = 'AUTO' then
    v_sewing_per_unit := v_sewing_per_unit + v_auto_tie_cost;
  end if;

  if v_triangle_stitch then
    v_sewing_per_unit := v_sewing_per_unit + v_triangle_stitch_cost;
  end if;

  if v_side_stitch then
    v_sewing_per_unit := v_sewing_per_unit + v_side_stitch_cost;
  end if;

  if v_bar_tack then
    v_sewing_per_unit := v_sewing_per_unit + v_bar_tack_cost;
  end if;

  if v_dimple then
    v_sewing_per_unit := v_sewing_per_unit + v_dimple_cost;
  end if;

  if v_spoderato then
    v_sewing_per_unit := v_sewing_per_unit + v_spoderato_cost;
  end if;

  if v_fold7 then
    v_sewing_per_unit := v_sewing_per_unit + v_fold7_cost;
  end if;

  if v_interlining = 'WOOL' then
    v_sewing_per_unit := v_sewing_per_unit + v_wool_interlining_cost;
  end if;

  if v_brand_label then
    v_sewing_per_unit := v_sewing_per_unit + v_brand_label_cost;
  end if;

  if v_care_label then
    v_sewing_per_unit := v_sewing_per_unit + v_care_label_cost;
  end if;

  sewing_cost := (v_sewing_per_unit * p_quantity) + v_start_cost;

  if v_fabric_provided then
    v_fabric_amount := 0;
  elsif v_design_type is null or v_fabric_type is null then
    raise exception 'Missing required design_type or fabric_type for custom order pricing';
  else
    select fp.unit_price
    into v_unit_fabric_cost
    from public.custom_order_fabric_prices fp
    where fp.design_type = v_design_type
      and fp.fabric_type = v_fabric_type;

    if v_unit_fabric_cost is null then
      raise exception 'Unsupported design/fabric option for custom order pricing';
    end if;

    v_fabric_amount := round(
      (p_quantity::numeric * v_unit_fabric_cost::numeric) / 4
    )::integer
      + case when v_design_type = 'YARN_DYED' then v_yarn_dyed_design_cost else 0 end;
  end if;

  fabric_cost := v_fabric_amount;

  -- 샘플 비용 계산
  if p_sample then
    if p_sample_type = 'fabric' then
      select copc.amount into sample_cost
      from public.custom_order_pricing_constants copc
      where copc.key = 'SAMPLE_FABRIC_COST';
    elsif p_sample_type = 'sewing' then
      select copc.amount into sample_cost
      from public.custom_order_pricing_constants copc
      where copc.key = 'SAMPLE_SEWING_COST';
    else -- fabric_and_sewing
      select copc.amount into sample_cost
      from public.custom_order_pricing_constants copc
      where copc.key = 'SAMPLE_FABRIC_AND_SEWING_COST';
    end if;

    if sample_cost is null then
      raise exception 'Sample pricing constants are not configured for type: %', p_sample_type;
    end if;
  else
    sample_cost := 0;
  end if;

  total_cost := sewing_cost + fabric_cost + sample_cost;

  return next;
end;
$$;

-- ── B. points 테이블: order_id+type 기준 partial unique index ──
-- admin_update_order_status의 포인트 적립 멱등성 보장을 위한 index.
-- confirm_payment_orders도 동일 index를 활용한다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_order_earn
  ON public.points (order_id, type)
  WHERE order_id IS NOT NULL AND type = 'earn';

-- ── C. confirm_payment_orders: ON CONFLICT 멱등 처리 ──
-- SECURITY DEFINER 사유: order_status_logs INSERT에 일반 유저 RLS 없음
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
  v_masked_key text;
  v_token_amount integer;
  v_plan_key text;
  v_plan_label text;
  v_points integer;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if p_payment_key is null or trim(p_payment_key) = '' then
    raise exception 'payment_key is required';
  end if;

  -- service role 경유(Edge Function) 시 auth.uid() = null → skip
  -- 직접 RPC 호출 시 호출자 신원 검증 (IS DISTINCT FROM: NULL 안전 비교)
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  -- payment_key 마스킹: 끝 8자리만 유지, 나머지 ****
  v_masked_key := case
    when length(p_payment_key) <= 8 then '****'
    else '****' || right(p_payment_key, 8)
  end;

  for v_order in
    select id, user_id, status, order_type
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    -- IS DISTINCT FROM: p_user_id가 NULL이어도 안전하게 비교
    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status != '결제중' then
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_post_status := case v_order.order_type
      when 'sale'  then '진행중'
      when 'token' then '완료'
      else '접수'
    end;

    update public.orders
    set status = v_post_status, payment_key = p_payment_key, updated_at = now()
    where id = v_order.id;

    insert into public.order_status_logs (
      order_id, changed_by, previous_status, new_status, memo
    ) values (
      v_order.id, p_user_id, v_order.status, v_post_status,
      'payment confirmed: ' || v_masked_key
    );

    -- token 주문: 토큰 부여 + 포인트 적립 (2%)
    if v_order.order_type = 'token' then
      select
        (oi.item_data->>'token_amount')::integer,
        oi.item_data->>'plan_key'
      into v_token_amount, v_plan_key
      from public.order_items oi
      where oi.order_id = v_order.id and oi.item_type = 'token'
      limit 1;

      if v_token_amount is null or v_token_amount <= 0 then
        raise exception 'token order % has no valid token_amount (plan_key: %)', v_order.id, v_plan_key;
      end if;

      v_plan_label := case v_plan_key
        when 'starter' then 'Starter'
        when 'popular' then 'Popular'
        when 'pro'     then 'Pro'
        else v_plan_key
      end;

      -- design_tokens: ON CONFLICT (work_id) DO NOTHING으로 TOCTOU 방지
      insert into public.design_tokens (user_id, amount, type, description, work_id)
      values (
        p_user_id,
        v_token_amount,
        'purchase',
        '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개)',
        'order_' || v_order.id::text
      )
      on conflict (work_id) do nothing;

      -- 포인트 적립 (결제 금액의 2%)
      select o.total_price into v_points
      from public.orders o
      where o.id = v_order.id;
      v_points := floor(v_points * 0.02);

      if v_points > 0 then
        -- ON CONFLICT (order_id, type) DO NOTHING으로 TOCTOU 방지 (idx_points_order_earn)
        insert into public.points (user_id, order_id, amount, type, description)
        values (
          p_user_id, v_order.id, v_points, 'earn',
          '토큰 구매 포인트 적립 (2%)'
        )
        on conflict (order_id, type) do nothing;
      end if;
    end if;

    v_updated_orders := v_updated_orders || jsonb_build_object(
      'orderId',     v_order.id,
      'orderType',   v_order.order_type,
      'tokenAmount', case when v_order.order_type = 'token' then v_token_amount else null end
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  -- 결제 확정 후 예약된 쿠폰을 사용 처리
  update public.user_coupons
  set status = 'used',
      used_at = now(),
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

  return jsonb_build_object(
    'success', true,
    'orders', v_updated_orders
  );
end;
$$;

-- ── D. admin_update_order_status: ON CONFLICT 멱등 처리 ──
-- SECURITY DEFINER 사유: 관리자 전용 함수이나 호출자(authenticated 역할)는 orders 테이블에
-- 직접 UPDATE 권한이 없고, order_status_logs 테이블에 INSERT 정책이 없어 RLS 우회가 필요하다.
-- 권한 상승 위험 통제: 함수 내부에서 auth.uid() + is_admin() 이중 검증을 수행하며,
-- 모든 상태 변경은 order_status_logs에 감사 로그로 기록된다.
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
  v_points_earned  integer;
  v_is_sample      boolean;
  v_sample_type    text;
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

  -- Lock the row and get current status, order type, price, user
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

  -- custom 주문인 경우 sample 정보 조회
  if v_order_type = 'custom' then
    select
      coalesce((oi.item_data->>'sample')::boolean, false),
      oi.item_data->>'sample_type'
    into v_is_sample, v_sample_type
    from public.order_items oi
    where oi.order_id = p_order_id and oi.item_type = 'custom'
    limit 1;

    if not found then
      raise exception 'custom order has no custom item for order %', p_order_id;
    end if;
  end if;

  if p_is_rollback then
    -- Rollback requires memo
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
    end if;

    -- Validate rollback transition by order_type
    -- 배송완료, 완료, 취소 상태는 is_rollback 여부와 무관하게 롤백 불가
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '진행중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        -- 기존 rollback
        (v_current_status = '결제중'   and p_new_status = '대기중')
        or (v_current_status = '접수'   and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수' and not v_is_sample)
        or (v_current_status = '제작중' and p_new_status = '샘플승인' and v_is_sample)
        or (v_current_status = '제작완료' and p_new_status = '제작중')
        -- 샘플 rollback
        or (v_current_status = '샘플원단제작중' and p_new_status = '접수')
        or (v_current_status = '샘플봉제제작중' and p_new_status = '접수'             and v_sample_type = 'sewing')
        or (v_current_status = '샘플봉제제작중' and p_new_status = '샘플원단배송중'   and v_sample_type = 'fabric_and_sewing')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
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
      -- token 롤백: 결제중 → 대기중 만 허용
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  else
    -- Validate forward state transition by order_type
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '진행중')
        or (v_current_status = '진행중'   and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중', '배송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        -- 공통 전이
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        -- 취소 (모든 샘플 상태 포함)
        or (p_new_status = '취소' and v_current_status in (
          '대기중', '결제중', '접수',
          '샘플원단제작중', '샘플원단배송중', '샘플봉제제작중',
          '샘플넥타이배송중', '샘플배송완료', '샘플승인'
        ))
        -- 비샘플 경로: 접수 → 제작중
        or (v_current_status = '접수' and p_new_status = '제작중' and not v_is_sample)
        -- 샘플 경로 (fabric, fabric_and_sewing)
        or (v_current_status = '접수'           and p_new_status = '샘플원단제작중'   and v_sample_type in ('fabric', 'fabric_and_sewing'))
        or (v_current_status = '샘플원단제작중' and p_new_status = '샘플원단배송중')
        or (v_current_status = '샘플원단배송중' and p_new_status = '샘플배송완료'     and v_sample_type = 'fabric')
        -- 샘플 경로 (sewing)
        or (v_current_status = '접수'           and p_new_status = '샘플봉제제작중'   and v_sample_type = 'sewing')
        -- 샘플 경로 (fabric_and_sewing 중간)
        or (v_current_status = '샘플원단배송중' and p_new_status = '샘플봉제제작중'   and v_sample_type = 'fabric_and_sewing')
        -- 샘플 공통 후반
        or (v_current_status = '샘플봉제제작중'   and p_new_status = '샘플넥타이배송중')
        or (v_current_status = '샘플넥타이배송중' and p_new_status = '샘플배송완료')
        or (v_current_status = '샘플배송완료'     and p_new_status = '샘플승인')
        or (v_current_status = '샘플승인'         and p_new_status = '제작중')
      ) then
        raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'     and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      -- token 순방향: 대기중 → 완료 (payment_key 필수 + 공백 체크), 취소
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

  -- Apply the status update with any timestamp side-effects
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
    -- Admin manually confirms purchase: 2% points
    v_points_earned := floor(v_total_price * 0.02);

    -- token 주문: 상태 변경 전 token item 검증 (부분 성공 방지)
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
      -- design_tokens: ON CONFLICT (work_id) DO NOTHING으로 TOCTOU 방지
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

    if v_points_earned > 0 then
      -- ON CONFLICT (order_id, type) DO NOTHING으로 중복 적립 방지 (idx_points_order_earn)
      insert into public.points (user_id, order_id, amount, type, description)
      values (
        v_user_id,
        p_order_id,
        v_points_earned,
        'earn',
        '구매확정 포인트 적립 (관리자 처리, 2%)'
      )
      on conflict (order_id, type) do nothing;
    end if;

  else
    update public.orders
    set status = p_new_status
    where id = p_order_id;
  end if;

  -- Insert status log
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

-- ── E. admin_update_order_status: anon role EXECUTE 권한 회수 ──
-- 20260307240000에서 부여된 anon GRANT ALL 회수.
-- 관리자 전용 함수이므로 anon은 호출 불가해야 한다.
-- authenticated는 함수 내부의 is_admin() 검증으로 제어되므로 유지.
REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, boolean) FROM anon;
