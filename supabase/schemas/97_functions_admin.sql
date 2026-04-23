-- ============================================================= 
-- 97_functions_admin.sql  – Admin management RPC functions 
-- =============================================================
-- ── admin_update_order_status ─────────────────────────────────
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
      -- token 완료는 confirm_payment 흐름에서만 처리. 관리자 수동 완료 불가.
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

CREATE OR REPLACE FUNCTION public.admin_get_generation_log_artifacts(
  p_workflow_id text
)
RETURNS TABLE (
  id uuid,
  workflow_id text,
  phase text,
  artifact_type text,
  source_work_id text,
  parent_artifact_id uuid,
  storage_provider text,
  image_url text,
  image_width integer,
  image_height integer,
  mime_type text,
  file_size_bytes bigint,
  status text,
  meta jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_workflow_id is null or btrim(p_workflow_id) = '' then
    raise exception 'p_workflow_id is required';
  end if;

  RETURN QUERY
  SELECT
    a.id,
    a.workflow_id,
    a.phase,
    a.artifact_type,
    a.source_work_id,
    a.parent_artifact_id,
    a.storage_provider,
    a.image_url,
    a.image_width,
    a.image_height,
    a.mime_type,
    a.file_size_bytes,
    a.status,
    a.meta,
    a.created_at
  FROM public.ai_generation_log_artifacts a
  WHERE a.workflow_id = p_workflow_id
  ORDER BY a.created_at ASC, a.id ASC;
end;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_generation_log_artifacts(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.write_ai_generation_log_artifact(
  p_id uuid,
  p_workflow_id text,
  p_phase text,
  p_artifact_type text,
  p_source_work_id text,
  p_parent_artifact_id uuid,
  p_storage_provider text,
  p_image_url text,
  p_image_width integer,
  p_image_height integer,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_status text,
  p_meta jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  INSERT INTO public.ai_generation_log_artifacts (
    id,
    workflow_id,
    phase,
    artifact_type,
    source_work_id,
    parent_artifact_id,
    storage_provider,
    image_url,
    image_width,
    image_height,
    mime_type,
    file_size_bytes,
    status,
    meta
  ) VALUES (
    p_id,
    p_workflow_id,
    p_phase,
    p_artifact_type,
    p_source_work_id,
    p_parent_artifact_id,
    p_storage_provider,
    p_image_url,
    p_image_width,
    p_image_height,
    p_mime_type,
    p_file_size_bytes,
    p_status,
    COALESCE(p_meta, '{}'::jsonb)
  );
end;
$$;

COMMENT ON FUNCTION public.write_ai_generation_log_artifact(
  uuid, text, text, text, text, uuid, text, text, integer, integer, text, bigint, text, jsonb
) IS 'Service-role-only RPC used by Edge Functions to record ai_generation_log_artifacts without direct table inserts; no auth.uid() validation by design.';

COMMENT ON FUNCTION public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) IS 'Admin-only listing with optional filters: id / request_type / status(success|error) / id_search(workflow_id|work_id exact).';

GRANT EXECUTE ON FUNCTION public.write_ai_generation_log_artifact(
  uuid, text, text, text, text, uuid, text, text, integer, integer, text, bigint, text, jsonb
) TO service_role;


-- ── admin_get_today_stats ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_today_stats(
  p_order_type text,
  p_date text
)
RETURNS TABLE (
  today_order_count bigint,
  today_revenue numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_date is null or p_date = '' then
    raise exception 'p_date is required';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair', 'token', 'sample') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS today_order_count,
    COALESCE(SUM("totalPrice"), 0)::numeric AS today_revenue
  FROM public.admin_order_list_view
  WHERE date = p_date
    AND (
      p_order_type = 'all'
      OR "orderType" = p_order_type
    );
end;
$$;

-- ── admin_get_period_stats ───────────────────────────────────
-- 기간 범위(start~end)의 주문 수와 매출 합계를 집계한다.
-- admin_get_today_stats 는 단일 날짜 전용으로 유지하고,
-- 날짜 범위 조회는 이 함수를 사용한다.
CREATE OR REPLACE FUNCTION public.admin_get_period_stats(
  p_order_type  text,
  p_start_date  date,
  p_end_date    date
)
RETURNS TABLE (
  period_order_count bigint,
  period_revenue     numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_start_date is null then
    raise exception 'p_start_date is required';
  end if;

  if p_end_date is null then
    raise exception 'p_end_date is required';
  end if;

  if p_start_date > p_end_date then
    raise exception 'p_start_date must be <= p_end_date';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair', 'token', 'sample') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint                        AS period_order_count,
    COALESCE(SUM(total_price), 0)::numeric  AS period_revenue
  FROM public.orders
  WHERE created_at >= p_start_date
    AND created_at <  p_end_date + 1
    AND (
      p_order_type = 'all'
      OR order_type = p_order_type
    );
end;
$$;

-- ── admin_update_order_tracking ─────────────────────────────────
-- SECURITY DEFINER 사용 근거:
--   스키마에서 authenticated 역할의 orders 테이블 직접 UPDATE가
--   REVOKE UPDATE ... FROM authenticated 로 제한되어 있다.
--   is_admin() 검증으로 관리자만 호출 가능하므로 SECURITY DEFINER가 적합하다.
CREATE OR REPLACE FUNCTION public.admin_update_order_tracking(
  p_order_id uuid,
  p_courier_company text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL,
  p_company_courier_company text DEFAULT NULL,
  p_company_tracking_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_order_status text;
  v_tracking_number text;
  v_company_tracking_number text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_tracking_number := nullif(trim(p_tracking_number), '');
  v_company_tracking_number := nullif(trim(p_company_tracking_number), '');

  update public.orders
  set
    courier_company = case
      when p_courier_company is not null
        then nullif(trim(p_courier_company), '')
      else courier_company
    end,
    tracking_number = case
      when p_tracking_number is not null
        then v_tracking_number
      else tracking_number
    end,
    shipped_at = case
      when p_tracking_number is not null and v_tracking_number is not null
        then coalesce(shipped_at, now())
      when p_tracking_number is not null and v_tracking_number is null
        then null
      else shipped_at
    end,
    company_courier_company = case
      when p_company_courier_company is not null
        then nullif(trim(p_company_courier_company), '')
      else company_courier_company
    end,
    company_tracking_number = case
      when p_company_tracking_number is not null
        then v_company_tracking_number
      else company_tracking_number
    end,
    company_shipped_at = case
      when p_company_tracking_number is not null
        and v_company_tracking_number is not null
        then coalesce(company_shipped_at, now())
      when p_company_tracking_number is not null
        and v_company_tracking_number is null
        then null
      else company_shipped_at
    end
  where id = p_order_id
    and status not in ('배송완료', '완료', '취소')
  returning status into v_order_status;

  if not found then
    select status
    into v_order_status
    from public.orders
    where id = p_order_id;

    if not found then
      raise exception 'Order not found';
    end if;

    raise exception 'Tracking cannot be updated for order status: %', v_order_status;
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$$;

-- ── admin_bulk_issue_coupons ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_bulk_issue_coupons(
  p_coupon_id uuid,
  p_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  with target_user_ids as (
    select distinct t.user_id
    from unnest(p_user_ids) as t(user_id)
    where t.user_id is not null
  ),
  upserted as (
    insert into public.user_coupons (user_id, coupon_id, status)
    select user_id, p_coupon_id, 'active'
    from target_user_ids
    on conflict (user_id, coupon_id)
    do update set status = excluded.status
    returning 1
  )
  select count(*)
  into v_affected_count
  from upserted;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;

-- ── admin_revoke_coupons_by_ids ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_coupons_by_ids(
  p_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  update public.user_coupons
  set status = 'revoked'
  where id = any(p_ids)
    and status = 'active';

  get diagnostics v_affected_count = row_count;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;

-- ── admin_revoke_coupons_by_user_ids ────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_coupons_by_user_ids(
  p_coupon_id uuid,
  p_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  update public.user_coupons
  set status = 'revoked'
  where coupon_id = p_coupon_id
    and user_id = any(p_user_ids)
    and status = 'active';

  get diagnostics v_affected_count = row_count;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;
