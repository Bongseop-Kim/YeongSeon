-- ============================================================= 
-- 97_functions_admin.sql  – Admin management RPC functions 
-- =============================================================
-- ── admin_update_order_status ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text DEFAULT NULL::text,
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
  v_repair_previous_status text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select status, order_type
  into v_current_status, v_order_type
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
      select case
        when exists (
          select 1
          from public.repair_pickup_requests r
          where r.order_id = p_order_id
        ) then '수거예정'
        when exists (
          select 1
          from public.repair_shipping_receipts r
          where r.order_id = p_order_id
            and r.receipt_type = 'no_tracking'
        ) then '발송확인중'
        else '발송중'
      end
      into v_repair_previous_status;

      if not (
        (v_current_status = '접수' and p_new_status = v_repair_previous_status)
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
        -- 송장 없는 접수: 관리자가 입고 확인 후 접수 처리
        or (v_current_status = '발송확인중' and p_new_status = '접수')
        -- 방문 수거: 수거(입고) 완료 후 접수 처리
        or (v_current_status = '수거예정' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '발송대기', '발송중', '발송확인중', '수거예정'))
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

COMMENT ON FUNCTION public.admin_update_order_status(uuid, text, text, boolean)
  IS 'SECURITY DEFINER is required so admins can update order status and write status logs while access is restricted by public.is_admin().';

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text,
  p_payment_key text,
  p_is_rollback boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  perform p_payment_key;

  return public.admin_update_order_status(
    p_order_id,
    p_new_status,
    p_memo,
    p_is_rollback
  );
end;
$$;

COMMENT ON FUNCTION public.admin_update_order_status(uuid, text, text, text, boolean)
  IS 'SECURITY DEFINER is required for legacy positional callers that still pass the deprecated p_payment_key placeholder while admin access remains restricted by public.is_admin() in the canonical function. Deprecated: placeholder p_payment_key retained for legacy positional callers; scheduled for removal in the next major release.';

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, text, boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_generation_logs(
  p_start_date      date,
  p_end_date        date,
  p_ai_model        text    DEFAULT null,
  p_limit           integer DEFAULT 50,
  p_offset          integer DEFAULT 0,
  p_id              uuid    DEFAULT null,
  p_request_type    text    DEFAULT null,
  p_status          text    DEFAULT null,
  p_id_search       text    DEFAULT null
)
RETURNS TABLE (
  id                    uuid,
  workflow_id           text,
  phase                 text,
  work_id               text,
  parent_work_id        text,
  user_id               uuid,
  ai_model              text,
  request_type          text,
  quality               text,
  user_message          text,
  prompt_length         integer,
  request_attachments   jsonb,
  design_context        jsonb,
  normalized_design     jsonb,
  conversation_turn     integer,
  has_ci_image          boolean,
  has_reference_image   boolean,
  has_previous_image    boolean,
  generate_image        boolean,
  detected_design       jsonb,
  image_prompt          text,
  ai_message            text,
  route                 text,
  image_generated       boolean,
  generated_image_url   text,
  repeat_tile_url       text,
  repeat_tile_work_id   text,
  accent_tile_url       text,
  accent_tile_work_id   text,
  pattern_type          text,
  fabric_type           text,
  tile_role             text,
  paired_tile_work_id   text,
  accent_layout_json    jsonb,
  tokens_charged        integer,
  tokens_refunded       integer,
  text_latency_ms       integer,
  image_latency_ms      integer,
  total_latency_ms      integer,
  error_type            text,
  error_message         text,
  created_at            timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  p_limit := least(greatest(coalesce(p_limit, 50), 0), 500);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_id_search is not null then
    return query
    (
      select
        l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id,
        l.user_id, l.ai_model, l.request_type, l.quality, l.user_message,
        l.prompt_length, l.request_attachments, l.design_context,
        l.normalized_design, l.conversation_turn, l.has_ci_image,
        l.has_reference_image, l.has_previous_image, l.generate_image,
        l.detected_design, l.image_prompt, l.ai_message, l.route,
        l.image_generated, l.generated_image_url, l.repeat_tile_url,
        l.repeat_tile_work_id, l.accent_tile_url, l.accent_tile_work_id,
        l.pattern_type, l.fabric_type, l.tile_role, l.paired_tile_work_id,
        l.accent_layout_json, l.tokens_charged, l.tokens_refunded,
        l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
        l.error_type, l.error_message, l.created_at
      from public.ai_generation_logs l
      where l.workflow_id = p_id_search
        and (p_ai_model     is null or l.ai_model     = p_ai_model)
        and (p_id           is null or l.id           = p_id)
        and (p_request_type is null or l.request_type = p_request_type)
        and (p_status       is null
             or (p_status = 'success' and l.error_type is null)
             or (p_status = 'error'   and l.error_type is not null))
      union all
      select
        l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id,
        l.user_id, l.ai_model, l.request_type, l.quality, l.user_message,
        l.prompt_length, l.request_attachments, l.design_context,
        l.normalized_design, l.conversation_turn, l.has_ci_image,
        l.has_reference_image, l.has_previous_image, l.generate_image,
        l.detected_design, l.image_prompt, l.ai_message, l.route,
        l.image_generated, l.generated_image_url, l.repeat_tile_url,
        l.repeat_tile_work_id, l.accent_tile_url, l.accent_tile_work_id,
        l.pattern_type, l.fabric_type, l.tile_role, l.paired_tile_work_id,
        l.accent_layout_json, l.tokens_charged, l.tokens_refunded,
        l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
        l.error_type, l.error_message, l.created_at
      from public.ai_generation_logs l
      where l.work_id = p_id_search
        and l.workflow_id is distinct from p_id_search
        and (p_ai_model     is null or l.ai_model     = p_ai_model)
        and (p_id           is null or l.id           = p_id)
        and (p_request_type is null or l.request_type = p_request_type)
        and (p_status       is null
             or (p_status = 'success' and l.error_type is null)
             or (p_status = 'error'   and l.error_type is not null))
    )
    order by created_at desc
    limit p_limit
    offset p_offset;
    return;
  end if;

  return query
  select
    l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id,
    l.user_id, l.ai_model, l.request_type, l.quality, l.user_message,
    l.prompt_length, l.request_attachments, l.design_context,
    l.normalized_design, l.conversation_turn, l.has_ci_image,
    l.has_reference_image, l.has_previous_image, l.generate_image,
    l.detected_design, l.image_prompt, l.ai_message, l.route,
    l.image_generated, l.generated_image_url, l.repeat_tile_url,
    l.repeat_tile_work_id, l.accent_tile_url, l.accent_tile_work_id,
    l.pattern_type, l.fabric_type, l.tile_role, l.paired_tile_work_id,
    l.accent_layout_json, l.tokens_charged, l.tokens_refunded,
    l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
    l.error_type, l.error_message, l.created_at
  from public.ai_generation_logs l
  where (p_id is not null or (
      l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz
      and l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz
    ))
    and (p_ai_model      is null or l.ai_model      = p_ai_model)
    and (p_id            is null or l.id            = p_id)
    and (p_request_type  is null or l.request_type  = p_request_type)
    and (p_status        is null
         or (p_status = 'success' and l.error_type is null)
         or (p_status = 'error'   and l.error_type is not null))
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) IS 'Admin-only listing with optional filters: id / request_type / status(success|error) / id_search(workflow_id|work_id exact).';

CREATE OR REPLACE FUNCTION public.admin_get_generation_log_groups(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_ai_model text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_request_type text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_id_search text DEFAULT NULL
)
RETURNS TABLE (
  workflow_id text,
  primary_log_id uuid,
  primary_work_id text,
  user_id uuid,
  ai_model text,
  request_type text,
  user_message text,
  pattern_type text,
  fabric_type text,
  image_count integer,
  success_count integer,
  error_count integer,
  tokens_charged integer,
  tokens_refunded integer,
  total_latency_ms integer,
  created_at timestamptz,
  result_images jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  p_limit := least(greatest(coalesce(p_limit, 50), 0), 500);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with filtered_logs as (
    select l.*
    from public.ai_generation_logs l
    where (p_id_search is not null or (
        p_start_date is null
        or p_end_date is null
        or (
          l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz
          and l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz
        )
      ))
      and (p_ai_model is null or l.ai_model = p_ai_model)
      and (p_request_type is null or l.request_type = p_request_type)
      and (
        p_id_search is null
        or coalesce(l.workflow_id, l.work_id) = p_id_search
        or l.work_id = p_id_search
        or exists (
          select 1
          from public.ai_generation_logs matched
          where matched.work_id = p_id_search
            and coalesce(matched.workflow_id, matched.work_id) = coalesce(l.workflow_id, l.work_id)
        )
      )
  ),
  grouped_logs as (
    select
      coalesce(l.workflow_id, l.work_id) as workflow_id,
      count(*)::integer as image_count,
      count(*) filter (where l.error_type is null and l.image_generated)::integer as success_count,
      count(*) filter (where l.error_type is not null or not l.image_generated)::integer as error_count,
      coalesce(sum(l.tokens_charged), 0)::integer as tokens_charged,
      coalesce(sum(l.tokens_refunded), 0)::integer as tokens_refunded,
      coalesce(sum(l.total_latency_ms), 0)::integer as total_latency_ms,
      max(l.created_at) as created_at,
      jsonb_agg(
        jsonb_build_object(
          'log_id', l.id,
          'work_id', l.work_id,
          'url', coalesce(l.generated_image_url, l.repeat_tile_url, l.accent_tile_url),
          'tile_role', l.tile_role,
          'status', case when l.error_type is not null or not l.image_generated then 'error' else 'success' end,
          'total_latency_ms', l.total_latency_ms
        )
        order by l.created_at asc, l.work_id asc
      ) as result_images
    from filtered_logs l
    group by coalesce(l.workflow_id, l.work_id)
  ),
  primary_logs as (
    select distinct on (coalesce(l.workflow_id, l.work_id))
      coalesce(l.workflow_id, l.work_id) as workflow_id,
      l.id as primary_log_id,
      l.work_id as primary_work_id,
      l.user_id,
      l.ai_model,
      l.request_type,
      l.user_message,
      l.pattern_type,
      l.fabric_type
    from filtered_logs l
    order by coalesce(l.workflow_id, l.work_id), l.created_at asc, l.work_id asc
  )
  select
    g.workflow_id,
    p.primary_log_id,
    p.primary_work_id,
    p.user_id,
    p.ai_model,
    p.request_type,
    p.user_message,
    p.pattern_type,
    p.fabric_type,
    g.image_count,
    g.success_count,
    g.error_count,
    g.tokens_charged,
    g.tokens_refunded,
    g.total_latency_ms,
    g.created_at,
    g.result_images
  from grouped_logs g
  join primary_logs p on p.workflow_id = g.workflow_id
  where p_status is null
    or (p_status = 'success' and g.error_count = 0)
    or (p_status = 'error' and g.error_count > 0)
  order by g.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_generation_log_groups(
  date, date, text, integer, integer, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.admin_get_generation_log_groups(
  date, date, text, integer, integer, text, text, text
) IS 'Admin-only grouped generation log feed. Returns one row per workflow_id with up to one result summary per render log.';

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

-- ── admin_get_seamless_generation_logs ──────────────────────────
-- seamless 생성 로그 목록. 무거운 intent 와 candidate.svg 는 제외하고
-- 썸네일 표시에 필요한 candidate.id/layout_id/source_fidelity/colorway_id/seed/png_url 만 남긴다.
CREATE OR REPLACE FUNCTION public.admin_get_seamless_generation_logs(
  p_start_date  date    DEFAULT NULL,
  p_end_date    date    DEFAULT NULL,
  p_input_type  text    DEFAULT NULL,
  p_status      text    DEFAULT NULL,
  p_id_search   text    DEFAULT NULL,
  p_limit       integer DEFAULT 50,
  p_offset      integer DEFAULT 0
)
RETURNS TABLE (
  id                        uuid,
  request_id                text,
  input_type                text,
  prompt                    text,
  has_reference_image       boolean,
  reference_image_bytes     integer,
  colorway                  text,
  seed                      bigint,
  candidate_count_requested integer,
  candidate_count_returned  integer,
  distinct_layouts          integer,
  available_strategies      integer,
  engine_version            text,
  registry_version          text,
  candidates                jsonb,
  warnings                  jsonb,
  generate_ms               numeric,
  render_ms                 numeric,
  status                    text,
  error_type                text,
  error_message             text,
  created_at                timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  p_limit := least(greatest(coalesce(p_limit, 50), 0), 500);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.request_id,
    l.input_type,
    l.prompt,
    l.has_reference_image,
    l.reference_image_bytes,
    l.colorway,
    l.seed,
    l.candidate_count_requested,
    l.candidate_count_returned,
    l.distinct_layouts,
    l.available_strategies,
    l.engine_version,
    l.registry_version,
    case
      when jsonb_typeof(l.candidates) = 'array' then (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', c->'id',
              'layout_id', c->'layout_id',
              'source_fidelity', c->'source_fidelity',
              'colorway_id', c->'colorway_id',
              'seed', c->'seed',
              'png_url', c->'png_url'
            )
            order by ord
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(l.candidates) with ordinality as t(c, ord)
      )
      else l.candidates
    end as candidates,
    l.warnings,
    l.generate_ms,
    l.render_ms,
    l.status,
    l.error_type,
    l.error_message,
    l.created_at
  from public.seamless_generation_logs l
  where (
      p_start_date is null
      or p_end_date is null
      or (
        l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz
        and l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz
      )
    )
    and (p_input_type is null or l.input_type = p_input_type)
    and (p_status     is null or l.status     = p_status)
    and (
      p_id_search is null
      or l.request_id = p_id_search
      or l.id::text = p_id_search
    )
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

COMMENT ON FUNCTION public.admin_get_seamless_generation_logs(
  date, date, text, text, text, integer, integer
) IS 'Admin-only seamless generation log listing. Excludes heavy intent and per-candidate svg; keeps candidate id/layout_id/source_fidelity/colorway_id/seed/png_url for thumbnails. Filters: input_type / status(success|partial|error) / id_search(request_id|id exact).';

GRANT EXECUTE ON FUNCTION public.admin_get_seamless_generation_logs(
  date, date, text, text, text, integer, integer
) TO authenticated;

-- ── admin_get_seamless_generation_log ───────────────────────────
-- 단건 전체 조회 (intent + candidates 전체, svg 포함).
CREATE OR REPLACE FUNCTION public.admin_get_seamless_generation_log(
  p_id uuid
)
RETURNS TABLE (
  id                        uuid,
  request_id                text,
  input_type                text,
  prompt                    text,
  has_reference_image       boolean,
  reference_image_bytes     integer,
  colorway                  text,
  seed                      bigint,
  candidate_count_requested integer,
  candidate_count_returned  integer,
  distinct_layouts          integer,
  available_strategies      integer,
  engine_version            text,
  registry_version          text,
  intent                    jsonb,
  candidates                jsonb,
  warnings                  jsonb,
  generate_ms               numeric,
  render_ms                 numeric,
  status                    text,
  error_type                text,
  error_message             text,
  created_at                timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.request_id,
    l.input_type,
    l.prompt,
    l.has_reference_image,
    l.reference_image_bytes,
    l.colorway,
    l.seed,
    l.candidate_count_requested,
    l.candidate_count_returned,
    l.distinct_layouts,
    l.available_strategies,
    l.engine_version,
    l.registry_version,
    l.intent,
    l.candidates,
    l.warnings,
    l.generate_ms,
    l.render_ms,
    l.status,
    l.error_type,
    l.error_message,
    l.created_at
  from public.seamless_generation_logs l
  where l.id = p_id;
end;
$$;

COMMENT ON FUNCTION public.admin_get_seamless_generation_log(uuid)
  IS 'Admin-only single seamless generation log including full intent and candidates (svg + png_url).';

GRANT EXECUTE ON FUNCTION public.admin_get_seamless_generation_log(uuid) TO authenticated;

-- ── admin_get_seamless_generation_stats ─────────────────────────
-- 기간 요약 + input_type 별 + status 별 집계.
CREATE OR REPLACE FUNCTION public.admin_get_seamless_generation_stats(
  p_start_date date,
  p_end_date   date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_result jsonb;
  v_start_at timestamptz := p_start_date::timestamp at time zone 'UTC';
  v_end_at timestamptz := (p_end_date + 1)::timestamp at time zone 'UTC';
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  with filtered_logs as materialized (
    select *
    from public.seamless_generation_logs
    where created_at >= v_start_at
      and created_at < v_end_at
  ),
  summary_data as (
    select jsonb_build_object(
      'total', count(*)::integer,
      'success_count', count(*) filter (where status = 'success')::integer,
      'partial_count', count(*) filter (where status = 'partial')::integer,
      'error_count', count(*) filter (where status = 'error')::integer,
      'avg_generate_ms', avg(generate_ms),
      'avg_render_ms', avg(render_ms)
    ) as value
    from filtered_logs
  ),
  by_input_type_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'input_type', input_type,
          'count', count
        )
        order by count desc, input_type
      ),
      '[]'::jsonb
    ) as value
    from (
      select input_type, count(*)::integer as count
      from filtered_logs
      group by input_type
    ) input_type_stats
  ),
  by_status_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'status', status,
          'count', count
        )
        order by count desc, status
      ),
      '[]'::jsonb
    ) as value
    from (
      select status, count(*)::integer as count
      from filtered_logs
      group by status
    ) status_stats
  )
  select jsonb_build_object(
    'summary', summary_data.value,
    'by_input_type', by_input_type_data.value,
    'by_status', by_status_data.value
  )
  into v_result
  from summary_data, by_input_type_data, by_status_data;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

COMMENT ON FUNCTION public.admin_get_seamless_generation_stats(date, date)
  IS 'Admin-only seamless generation stats: summary (total, success/partial/error, avg generate_ms/render_ms), by_input_type, by_status.';

GRANT EXECUTE ON FUNCTION public.admin_get_seamless_generation_stats(date, date) TO authenticated;
