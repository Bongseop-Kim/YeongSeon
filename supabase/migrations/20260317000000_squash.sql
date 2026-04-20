


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'customer',
    'admin',
    'manager'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_bulk_issue_coupons"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_bulk_issue_coupons"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_email"("uid" "uuid") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND public.is_admin()
    THEN (SELECT email FROM auth.users WHERE id = uid)
    ELSE NULL
  END;
$$;


ALTER FUNCTION "public"."admin_get_email"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_period_stats"("p_order_type" "text", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("period_order_count" bigint, "period_revenue" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair') then
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


ALTER FUNCTION "public"."admin_get_period_stats"("p_order_type" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_today_stats"("p_order_type" "text", "p_date" "text") RETURNS TABLE("today_order_count" bigint, "today_revenue" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_date is null or p_date = '' then
    raise exception 'p_date is required';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair') then
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


ALTER FUNCTION "public"."admin_get_today_stats"("p_order_type" "text", "p_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_revoke_coupons_by_ids"("p_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_revoke_coupons_by_ids"("p_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_revoke_coupons_by_user_ids"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_revoke_coupons_by_user_ids"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_claim_status"("p_claim_id" "uuid", "p_new_status" "text", "p_memo" "text" DEFAULT NULL::"text", "p_is_rollback" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_admin_id uuid;
  v_current_status text;
  v_claim_type text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status + claim type
  select c.status, c.type
  into v_current_status, v_claim_type
  from public.claims c
  where c.id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
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
        raise exception 'Invalid transition from "%" to "%" for token_refund claim. 완료 처리는 approve_token_refund()를 사용하세요.', v_current_status, p_new_status;
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


ALTER FUNCTION "public"."admin_update_claim_status"("p_claim_id" "uuid", "p_new_status" "text", "p_memo" "text", "p_is_rollback" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_memo" "text" DEFAULT NULL::"text", "p_is_rollback" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_admin_id             uuid;
  v_current_status       text;
  v_order_type           text;
  v_total_price          integer;
  v_user_id              uuid;
  v_is_sample            boolean;
  v_sample_type          text;
  v_token_amount         integer;
  v_plan_key             text;
  v_plan_label           text;
  v_payment_key          text;
  v_token_already_minted boolean;
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
      -- token 순방향: 대기중 → 완료 (payment_key 필수), 취소
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
    -- token 주문: 상태 변경 전 token item 검증 (부분 성공 방지)
    if v_order_type = 'token' then
      -- 항상 메타데이터를 먼저 조회 (NULL INSERT 방지)
      select (oi.item_data->>'token_amount')::integer, oi.item_data->>'plan_key'
      into v_token_amount, v_plan_key
      from public.order_items oi
      where oi.order_id = p_order_id and oi.item_type = 'token'
      limit 1;

      -- 레거시 포맷 포함 이중 민팅 방지
      v_token_already_minted := exists (
        select 1 from public.design_tokens
        where work_id in (
          'order_' || p_order_id::text,
          'order_' || p_order_id::text || '_paid'
        )
      );

      if not v_token_already_minted then
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
      if not v_token_already_minted then
        insert into public.design_tokens (user_id, amount, type, token_class, description, work_id)
        values (
          v_user_id,
          v_token_amount,
          'purchase',
          'paid',
          '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개, 관리자 확정)',
          'order_' || p_order_id::text
        )
        on conflict (work_id) where work_id is not null do nothing;
      end if;
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


ALTER FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_memo" "text", "p_is_rollback" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_order_tracking"("p_order_id" "uuid", "p_courier_company" "text" DEFAULT NULL::"text", "p_tracking_number" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_admin_id uuid;
  v_tracking_number text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_tracking_number := nullif(trim(p_tracking_number), '');

  update public.orders
  set
    courier_company = nullif(trim(p_courier_company), ''),
    tracking_number = v_tracking_number,
    shipped_at = case
      when v_tracking_number is not null then coalesce(shipped_at, now())
      else shipped_at
    end
  where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$$;


ALTER FUNCTION "public"."admin_update_order_tracking"("p_order_id" "uuid", "p_courier_company" "text", "p_tracking_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_quote_request_status"("p_quote_request_id" "uuid", "p_new_status" "text", "p_quoted_amount" integer DEFAULT NULL::integer, "p_quote_conditions" "text" DEFAULT NULL::"text", "p_admin_memo" "text" DEFAULT NULL::"text", "p_memo" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_admin_id uuid;
  v_current_status text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status
  select qr.status
  into v_current_status
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if not found then
    raise exception 'Quote request not found';
  end if;

  -- Validate new status
  if p_new_status is null or p_new_status not in ('요청', '견적발송', '협의중', '확정', '종료') then
    raise exception 'Invalid status';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  -- Validate state transition
  if not (
    (v_current_status = '요청'     and p_new_status in ('견적발송', '종료'))
    or (v_current_status = '견적발송' and p_new_status in ('협의중', '종료'))
    or (v_current_status = '협의중'   and p_new_status in ('확정', '종료'))
  ) then
    raise exception 'Invalid transition from "%" to "%"', v_current_status, p_new_status;
  end if;

  -- Validate quoted_amount is non-negative
  if p_quoted_amount is not null and p_quoted_amount < 0 then
    raise exception 'Quoted amount must be non-negative';
  end if;

  -- Update quote request
  update public.quote_requests
  set
    status = p_new_status,
    quoted_amount = coalesce(p_quoted_amount, quoted_amount),
    quote_conditions = coalesce(p_quote_conditions, quote_conditions),
    admin_memo = coalesce(p_admin_memo, admin_memo)
  where id = p_quote_request_id;

  -- Insert status log
  insert into public.quote_request_status_logs (
    quote_request_id,
    changed_by,
    previous_status,
    new_status,
    memo
  )
  values (
    p_quote_request_id,
    v_admin_id,
    v_current_status,
    p_new_status,
    p_memo
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;


ALTER FUNCTION "public"."admin_update_quote_request_status"("p_quote_request_id" "uuid", "p_new_status" "text", "p_quoted_amount" integer, "p_quote_conditions" "text", "p_admin_memo" "text", "p_memo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_token_refund"("p_request_id" "uuid", "p_admin_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role       text;
  v_req               record;
  v_paid_token_amount integer;
  v_order_status      text;
BEGIN
  -- service_role 전용
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: approve_token_refund requires service_role';
  END IF;

  SELECT c.id, c.user_id, c.order_id,
         (c.refund_data->>'paid_token_amount')::int AS paid_token_amount,
         (c.refund_data->>'bonus_token_amount')::int AS bonus_token_amount,
         c.status
    INTO v_req
    FROM public.claims c
   WHERE c.id = p_request_id
     AND c.type = 'token_refund'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_req.user_id::text));

  -- 이미 완료된 경우 멱등하게 성공 반환
  IF v_req.status = '완료' THEN
    RETURN;
  END IF;

  -- 접수 상태만 허용 (처리중 중간 상태 없음)
  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'refund request is not in processable state (status: %)', v_req.status;
  END IF;

  v_paid_token_amount := v_req.paid_token_amount;

  SELECT o.status INTO v_order_status
    FROM public.orders o
   WHERE o.id = v_req.order_id
     FOR UPDATE;

  -- 유료 토큰 회수
  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, description, work_id
  ) VALUES (
    v_req.user_id, -v_paid_token_amount, 'refund', 'paid',
    '토큰 환불 승인 (유료)',
    'refund_' || p_request_id::text || '_paid'
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;

  IF v_req.bonus_token_amount > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, description, work_id
    ) VALUES (
      v_req.user_id, -v_req.bonus_token_amount, 'refund', 'bonus',
      '토큰 환불 승인 (보너스)',
      'refund_' || p_request_id::text || '_bonus'
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  -- 주문 취소 처리 (전액 환불이므로 항상 취소)
  UPDATE public.orders
     SET status = '취소', updated_at = now()
   WHERE id = v_req.order_id;

  INSERT INTO public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) VALUES (
    v_req.order_id, p_admin_id, v_order_status, '취소',
    '토큰 환불 승인 (request_id: ' || p_request_id::text || ')'
  );

  -- claim_status_logs 기록 (상태 전이 감사 추적)
  INSERT INTO public.claim_status_logs (
    claim_id, changed_by, previous_status, new_status, memo, is_rollback
  ) VALUES (
    p_request_id, p_admin_id, '접수', '완료', '토큰 환불 승인', false
  );

  -- 환불 요청 상태 업데이트
  UPDATE public.claims
     SET status     = '완료',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$$;


ALTER FUNCTION "public"."approve_token_refund"("p_request_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_confirm_delivered_orders"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order  record;
  v_count  integer := 0;
begin
  -- pg_cron 또는 service_role 호출만 허용
  -- ''는 pg_cron 전용: pg_cron은 JWT 없이 DB 레벨에서 실행되므로 role claim이 NULL → ''로 평가됨
  -- HTTP를 통한 외부 호출은 반드시 JWT를 포함하므로 ''로 도달할 수 없음
  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'unauthorized: scheduler-only function';
  end if;

  for v_order in
    select id, user_id, total_price, status
    from public.orders
    where (
      (status = '배송완료' and delivered_at <= now() - interval '7 days')
      or
      (status = '배송중' and shipped_at <= now() - interval '7 days')
    )
    and not exists (
      select 1
      from public.claims c
      join public.order_items oi on oi.id = c.order_item_id
      where oi.order_id = orders.id
        and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
    )
    for update skip locked
  loop
    update public.orders
    set status       = '완료',
        confirmed_at = now()
    where id = v_order.id;

    -- Audit log (changed_by = NULL indicates automated system action)
    insert into public.order_status_logs (
      order_id,
      changed_by,
      previous_status,
      new_status,
      memo
    )
    values (
      v_order.id,
      NULL,
      v_order.status,
      '완료',
      format('자동 구매확정 (%s 후 7일 경과)', v_order.status)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'confirmed_count', v_count
  );
end;
$$;


ALTER FUNCTION "public"."auto_confirm_delivered_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_product_code"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_prefix text;
  v_date_str text;
  v_seq integer;
begin
  if NEW.code IS NOT NULL AND NEW.code <> '' then
    return NEW;
  end if;

  v_prefix := case NEW.category
    when '3fold' then '3F'
    when 'sfolderato' then 'SF'
    when 'knit' then 'KN'
    when 'bowtie' then 'BT'
    else 'XX'
  end;

  v_date_str := to_char(now(), 'YYYYMMDD');

  perform pg_advisory_xact_lock(hashtext('PROD' || v_prefix || v_date_str));

  select coalesce(
    max(cast(substring(code from length(v_prefix || '-' || v_date_str || '-') + 1) as integer)),
    0
  ) + 1
  into v_seq
  from products
  where code like v_prefix || '-' || v_date_str || '-%'
    and substring(code from length(v_prefix || '-' || v_date_str || '-') + 1) ~ '^\d+$';

  if v_seq > 999 then
    raise exception 'Product code sequence overflow: % codes already exist for prefix % on %',
      v_seq - 1, v_prefix, v_date_str;
  end if;

  NEW.code := v_prefix || '-' || v_date_str || '-' || lpad(v_seq::text, 3, '0');
  return NEW;
end;
$_$;


ALTER FUNCTION "public"."auto_generate_product_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean DEFAULT false, "p_sample_type" "text" DEFAULT NULL::"text") RETURNS TABLE("sewing_cost" integer, "fabric_cost" integer, "sample_cost" integer, "total_cost" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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
  from public.pricing_constants
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
    raise exception 'fabric_provided=false이지만 design_type 또는 fabric_type이 null입니다';
  else
    select pc.amount
    into v_unit_fabric_cost
    from public.pricing_constants pc
    where pc.key = 'FABRIC_' || v_design_type || '_' || v_fabric_type;

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
      select pc.amount into sample_cost
      from public.pricing_constants pc
      where pc.key = 'SAMPLE_FABRIC_COST';
    elsif p_sample_type = 'sewing' then
      select pc.amount into sample_cost
      from public.pricing_constants pc
      where pc.key = 'SAMPLE_SEWING_COST';
    else -- fabric_and_sewing
      select pc.amount into sample_cost
      from public.pricing_constants pc
      where pc.key = 'SAMPLE_FABRIC_AND_SEWING_COST';
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


ALTER FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_sample_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_refund_amount"("p_order_id" "uuid") RETURNS TABLE("refund_amount" integer, "deducted_sample_cost" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_total_price integer;
  v_sample_cost integer;
  v_status text;
  v_order_type text;
begin
  select o.total_price, o.sample_cost, o.status, o.order_type
  into v_total_price, v_sample_cost, v_status, v_order_type
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  -- custom 주문이 아닌 경우 전액 환불
  if v_order_type != 'custom' then
    if not (
      (v_order_type = 'sale'   and v_status in ('대기중', '결제중', '진행중'))
      or (v_order_type = 'repair' and v_status in ('대기중', '결제중', '접수'))
      or (v_order_type = 'token'  and v_status in ('대기중', '결제중'))
    ) then
      raise exception '현재 주문 상태에서는 환불 계산을 할 수 없습니다';
    end if;
    refund_amount := v_total_price;
    deducted_sample_cost := 0;
    return next;
    return;
  end if;

  -- 샘플 진행 중 상태: sample_cost 공제
  if v_status in (
    '샘플원단제작중', '샘플원단배송중', '샘플봉제제작중',
    '샘플넥타이배송중', '샘플배송완료', '샘플승인'
  ) then
    refund_amount := v_total_price - v_sample_cost;
    deducted_sample_cost := v_sample_cost;
    return next;
    return;
  end if;

  -- 대기중, 결제중, 접수: 전액 환불
  if v_status in ('대기중', '결제중', '접수') then
    refund_amount := v_total_price;
    deducted_sample_cost := 0;
    return next;
    return;
  end if;

  raise exception '현재 주문 상태에서는 환불 계산을 할 수 없습니다: %', v_status;
end;
$$;


ALTER FUNCTION "public"."calculate_refund_amount"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_token_refund"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_req     record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  SELECT c.id, c.user_id, c.status
    INTO v_req
    FROM public.claims c
   WHERE c.id = p_request_id
     AND c.type = 'token_refund'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  IF v_req.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden: refund request not owned by user';
  END IF;

  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'only pending requests can be cancelled (status: %)', v_req.status;
  END IF;

  UPDATE public.claims
     SET status = '거부',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$$;


ALTER FUNCTION "public"."cancel_token_refund"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid", "p_payment_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

    -- token 주문: 토큰 지급
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

      -- 토큰 지급: ON CONFLICT (work_id) DO NOTHING으로 TOCTOU 방지
      insert into public.design_tokens (user_id, amount, type, token_class, description, work_id)
      values (
        p_user_id,
        v_token_amount,
        'purchase',
        'paid',
        '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개)',
        'order_' || v_order.id::text || '_paid'
      )
      on conflict (work_id) do nothing;
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


ALTER FUNCTION "public"."confirm_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid", "p_payment_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text" DEFAULT NULL::"text", "p_quantity" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

  -- cancel 상태 가드 (화이트리스트: 허용된 상태만 취소 가능)
  if p_type = 'cancel' then
    if not (
      (v_order_type = 'sale'   and v_order_status in ('대기중', '결제중', '진행중'))
      or (v_order_type = 'custom' and v_order_status in ('대기중', '결제중', '접수', '샘플원단제작중', '샘플원단배송중', '샘플봉제제작중', '샘플넥타이배송중', '샘플배송완료', '샘플승인'))
      or (v_order_type = 'repair' and v_order_status in ('대기중', '결제중', '접수'))
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
  if exists (
    select 1
    from public.claims
    where order_item_id = v_order_item.id
      and type = p_type
      and status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
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


ALTER FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_custom_order_txn"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_additional_notes" "text", "p_reference_images" "jsonb", "p_shipping_address_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id            uuid := auth.uid();
  v_order_id           uuid;
  v_order_number       text;
  v_payment_group_id   uuid := gen_random_uuid();
  v_sewing_cost        integer;
  v_fabric_cost        integer;
  v_total_cost         integer;
  v_base_unit          integer;
  v_reform_data        jsonb;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- guard 1: quantity must be positive
  if p_quantity <= 0 then
    raise exception 'p_quantity must be greater than 0';
  end if;

  -- guard 2: shipping address ownership
  if not exists (
    select 1 from public.shipping_addresses
    where id = p_shipping_address_id
      and user_id = v_user_id
  ) then
    raise exception 'Shipping address not found or access denied';
  end if;

  select sewing_cost, fabric_cost, total_cost
    into v_sewing_cost, v_fabric_cost, v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity);

  v_base_unit := v_total_cost / p_quantity;

  v_reform_data := jsonb_build_object(
    'options', p_options,
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'total_cost', v_total_cost
    ),
    'quantity', p_quantity,
    'sample', p_sample,
    'additional_notes', p_additional_notes,
    'reference_images', coalesce(p_reference_images, '[]'::jsonb)
  );

  v_order_number := 'C' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));

  insert into public.orders (
    user_id, order_number, order_type, status,
    total_price, original_price, total_discount,
    shipping_address_id, payment_group_id, shipping_cost
  )
  values (
    v_user_id, v_order_number, 'custom', '대기중',
    v_total_cost, v_total_cost, 0,
    p_shipping_address_id, v_payment_group_id, 0
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    selected_option_id,
    reform_data,
    quantity,
    unit_price,
    discount_amount,
    line_discount_amount,
    applied_user_coupon_id
  )
  values (
    v_order_id,
    'custom-order-' || v_order_id::text,
    'custom',
    null,
    null,
    v_reform_data,
    p_quantity,
    v_base_unit,
    0,
    0,
    null
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;


ALTER FUNCTION "public"."create_custom_order_txn"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_additional_notes" "text", "p_reference_images" "jsonb", "p_shipping_address_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[] DEFAULT '{}'::"text"[], "p_additional_notes" "text" DEFAULT ''::"text", "p_sample" boolean DEFAULT false, "p_sample_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_payment_group_id uuid;
  v_sewing_cost integer;
  v_fabric_cost integer;
  v_total_cost integer;
  v_reform_data jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- p_sample / p_sample_type 정합성 검증
  if p_sample is not true and p_sample_type is not null then
    raise exception 'p_sample_type must be null when p_sample is not true';
  end if;

  if p_sample is true and (p_sample_type is null or trim(p_sample_type) = '') then
    raise exception 'p_sample_type is required when p_sample is true';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  select
    amounts.sewing_cost,
    amounts.fabric_cost,
    amounts.total_cost
  into
    v_sewing_cost,
    v_fabric_cost,
    v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity) as amounts;

  v_order_number := public.generate_order_number();
  v_payment_group_id := gen_random_uuid();

  insert into public.orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    order_type,
    status,
    payment_group_id
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
    'custom',
    '대기중',
    v_payment_group_id
  )
  returning id into v_order_id;

  v_reform_data := jsonb_build_object(
    'custom_order', true,
    'quantity', p_quantity,
    'options', p_options,
    'reference_image_urls', to_jsonb(coalesce(p_reference_image_urls, '{}'::text[])),
    'additional_notes', coalesce(p_additional_notes, ''),
    'sample', coalesce(p_sample, false),
    'sample_type', p_sample_type,
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'total_cost', v_total_cost
    )
  );

  insert into public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    selected_option_id,
    reform_data,
    quantity,
    unit_price,
    discount_amount,
    line_discount_amount,
    applied_user_coupon_id
  )
  values (
    v_order_id,
    'custom-order-' || v_order_id::text,
    'reform',
    null,
    null,
    v_reform_data,
    p_quantity,
    floor(v_total_cost::numeric / p_quantity)::integer,
    0,
    0,
    null
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;


ALTER FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb" DEFAULT '[]'::"jsonb", "p_additional_notes" "text" DEFAULT ''::"text", "p_sample" boolean DEFAULT false, "p_sample_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_payment_group_id uuid;
  v_sewing_cost integer;
  v_fabric_cost integer;
  v_sample_cost integer;
  v_total_cost integer;
  v_reform_data jsonb;
  v_elem jsonb;
  v_idx integer;
  v_base_unit integer;
  v_remainder integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if p_reference_images is not null and jsonb_typeof(p_reference_images) <> 'array' then
    raise exception 'p_reference_images must be a JSON array';
  end if;

  v_idx := 0;
  if p_reference_images is not null then
    for v_elem in select jsonb_array_elements(p_reference_images) loop
      if jsonb_typeof(v_elem) <> 'object'
         or not (v_elem ? 'url')
         or not (v_elem ? 'file_id')
         or jsonb_typeof(v_elem->'url') <> 'string'
         or jsonb_typeof(v_elem->'file_id') not in ('string', 'null') then
        raise exception 'p_reference_images[%] must be an object with string "url" and "file_id" keys, and "file_id" must be a string or null', v_idx;
      end if;
      v_idx := v_idx + 1;
    end loop;
  end if;

  -- p_sample / p_sample_type 정합성 검증
  if p_sample is not true and p_sample_type is not null then
    raise exception 'p_sample_type must be null when p_sample is not true';
  end if;

  if p_sample is true and (p_sample_type is null or trim(p_sample_type) = '') then
    raise exception 'p_sample_type is required when p_sample is true';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  select
    amounts.sewing_cost,
    amounts.fabric_cost,
    amounts.sample_cost,
    amounts.total_cost
  into
    v_sewing_cost,
    v_fabric_cost,
    v_sample_cost,
    v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity, p_sample, p_sample_type) as amounts;

  v_base_unit := floor(v_total_cost::numeric / p_quantity)::integer;
  v_remainder := v_total_cost - v_base_unit * p_quantity;

  v_order_number := public.generate_order_number();
  v_payment_group_id := gen_random_uuid();

  insert into public.orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    order_type,
    status,
    payment_group_id,
    sample_cost
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
    'custom',
    '대기중',
    v_payment_group_id,
    v_sample_cost
  )
  returning id into v_order_id;

  v_reform_data := jsonb_build_object(
    'custom_order', true,
    'quantity', p_quantity,
    'options', p_options,
    'reference_images', coalesce(p_reference_images, '[]'::jsonb),
    'additional_notes', coalesce(p_additional_notes, ''),
    'sample', coalesce(p_sample, false),
    'sample_type', p_sample_type,
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'sample_cost', v_sample_cost,
      'total_cost', v_total_cost,
      'unit_price_remainder', v_remainder
    )
  );

  insert into public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    selected_option_id,
    item_data,
    quantity,
    unit_price,
    discount_amount,
    line_discount_amount,
    applied_user_coupon_id
  )
  values (
    v_order_id,
    'custom-order-' || v_order_id::text,
    'custom',
    null,
    null,
    v_reform_data,
    p_quantity,
    v_base_unit,
    0,
    0,
    null
  );

  -- images 테이블에 참조 이미지 등록
  -- SECURITY DEFINER이므로 RLS bypass. RPC 내부에서 이미 v_user_id := auth.uid() 소유권 검증 완료.
  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/custom-orders',
      'custom_order',
      v_order_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;


ALTER FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") IS 'SECURITY DEFINER: 주문제작 주문 생성 시 order_items에 item_data(JSONB) 포함 INSERT 수행. RLS가 주문 소유자 기준으로 설정되어 있어 신규 order 직후 동일 트랜잭션 내 order_items INSERT가 INVOKER 권한으로 차단될 수 있음. auth.uid() 소유권 검증은 함수 내부에서 수행.';



CREATE OR REPLACE FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_normalized_items jsonb := '[]'::jsonb;

  v_item_id text;
  v_item_type text;
  v_product_id integer;
  v_selected_option_id text;
  v_reform_data jsonb;
  v_quantity integer;
  v_applied_coupon_id uuid;
  v_unit_price integer;
  v_discount_amount integer;
  v_capped_line_discount integer;
  v_discount_remainder integer;
  v_option_additional_price integer;
  v_line_discount_total integer;
  v_product_stock integer;
  v_option_stock integer;

  v_original_price integer := 0;
  v_total_discount integer := 0;
  v_total_price integer := 0;
  v_reform_base_cost integer;
  v_reform_shipping_cost integer;
  v_used_coupon_ids uuid[] := '{}'::uuid[];
  v_coupon record;
  v_order_type text;

  v_payment_group_id uuid;
  v_group_total_amount integer := 0;
  v_orders_result jsonb := '[]'::jsonb;
  v_product_items jsonb := '[]'::jsonb;
  v_reform_items jsonb := '[]'::jsonb;
  v_product_original integer := 0;
  v_product_discount integer := 0;
  v_reform_original integer := 0;
  v_reform_discount integer := 0;
  v_shipping_cost integer;
  v_tie_image text;
  v_tie_file_id text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items are required';
  end if;

  if not exists (
    select 1
    from shipping_addresses
    where id = p_shipping_address_id
      and user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := nullif(v_item->>'item_id', '');
    v_item_type := v_item->>'item_type';
    v_quantity := nullif(v_item->>'quantity', '')::integer;
    v_applied_coupon_id := nullif(v_item->>'applied_user_coupon_id', '')::uuid;
    v_discount_amount := 0;
    v_option_additional_price := 0;
    v_line_discount_total := 0;

    if v_item_id is null then
      raise exception 'Invalid item id';
    end if;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    if v_item_type = 'product' then
      v_product_id := nullif(v_item->>'product_id', '')::integer;
      v_selected_option_id := nullif(v_item->>'selected_option_id', '');
      v_reform_data := null;

      if v_product_id is null then
        raise exception 'Product id is required';
      end if;

      select p.price, p.stock
      into v_unit_price, v_product_stock
      from products p
      where p.id = v_product_id
      for update;

      if not found then
        raise exception 'Product not found';
      end if;

      if v_selected_option_id is not null then
        select coalesce(po.additional_price, 0), po.stock
        into v_option_additional_price, v_option_stock
        from product_options po
        where po.product_id = v_product_id
          and po.id::text = v_selected_option_id
        for update;

        if not found then
          raise exception 'Selected option not found';
        end if;

        if v_option_stock is not null then
          if v_option_stock < v_quantity then
            raise exception 'Insufficient stock for option';
          end if;
          update product_options
          set stock = stock - v_quantity
          where product_id = v_product_id
            and id::text = v_selected_option_id;
        end if;
      else
        if v_product_stock is not null then
          if v_product_stock < v_quantity then
            raise exception 'Insufficient stock';
          end if;
          update products
          set stock = stock - v_quantity
          where id = v_product_id;
        end if;
      end if;

      v_unit_price := v_unit_price + v_option_additional_price;
    elsif v_item_type = 'reform' then
      v_product_id := null;
      v_selected_option_id := null;
      v_reform_data := v_item->'reform_data';

      -- reform 아이템이 실제로 있을 때만 pricing constants 조회 (최초 1회)
      if v_reform_base_cost is null then
        SELECT amount INTO v_reform_base_cost
        FROM pricing_constants WHERE key = 'REFORM_BASE_COST';
        IF v_reform_base_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_BASE_COST';
        END IF;

        SELECT amount INTO v_reform_shipping_cost
        FROM pricing_constants WHERE key = 'REFORM_SHIPPING_COST';
        IF v_reform_shipping_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_SHIPPING_COST';
        END IF;
      end if;

      if v_reform_data is null or v_reform_data = 'null'::jsonb then
        raise exception 'Reform data is required';
      end if;

      v_unit_price := v_reform_base_cost;
      v_reform_data := jsonb_set(
        v_reform_data,
        '{cost}',
        to_jsonb(v_reform_base_cost),
        true
      );
    else
      raise exception 'Invalid item type';
    end if;

    if v_applied_coupon_id is not null then
      if v_applied_coupon_id = any(v_used_coupon_ids) then
        raise exception 'Coupon can only be applied once per order';
      end if;

      select
        uc.id,
        uc.status,
        uc.expires_at,
        c.discount_type,
        c.discount_value,
        c.max_discount_amount,
        c.expiry_date,
        c.is_active
      into v_coupon
      from user_coupons uc
      join coupons c on c.id = uc.coupon_id
      where uc.id = v_applied_coupon_id
        and uc.user_id = v_user_id
      for update;

      if not found then
        raise exception 'Coupon not found';
      end if;

      if v_coupon.status <> 'active' then
        raise exception 'Coupon is not available';
      end if;

      if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
        raise exception 'Coupon has expired';
      end if;

      if coalesce(v_coupon.is_active, false) is not true then
        raise exception 'Coupon is not active';
      end if;

      if v_coupon.expiry_date is not null and v_coupon.expiry_date < current_date then
        raise exception 'Coupon has expired';
      end if;

      if v_coupon.discount_type = 'percentage' then
        v_discount_amount :=
          floor(v_unit_price * (v_coupon.discount_value::numeric / 100.0))::integer;
      elsif v_coupon.discount_type = 'fixed' then
        v_discount_amount := floor(v_coupon.discount_value::numeric)::integer;
      else
        raise exception 'Invalid coupon type';
      end if;

      v_discount_amount := greatest(0, least(v_discount_amount, v_unit_price));

      v_capped_line_discount := v_discount_amount * v_quantity;
      if v_coupon.max_discount_amount is not null then
        v_capped_line_discount := least(v_capped_line_discount, v_coupon.max_discount_amount);
      end if;

      v_discount_amount := floor(v_capped_line_discount::numeric / v_quantity)::integer;
      v_discount_remainder := v_capped_line_discount % v_quantity;
      v_line_discount_total := (v_discount_amount * v_quantity) + v_discount_remainder;
      v_used_coupon_ids := array_append(v_used_coupon_ids, v_applied_coupon_id);
    end if;

    v_original_price := v_original_price + (v_unit_price * v_quantity);
    if v_applied_coupon_id is not null then
      v_total_discount := v_total_discount + v_line_discount_total;
    end if;

    v_normalized_items := v_normalized_items || jsonb_build_array(
      jsonb_build_object(
        'item_id', v_item_id,
        'item_type', v_item_type,
        'product_id', v_product_id,
        'selected_option_id', v_selected_option_id,
        'reform_data', v_reform_data,
        'quantity', v_quantity,
        'unit_price', v_unit_price,
        'discount_amount', v_discount_amount,
        'line_discount_amount', v_line_discount_total,
        'applied_user_coupon_id', v_applied_coupon_id
      )
    );
  end loop;

  v_payment_group_id := gen_random_uuid();

  for v_item in select * from jsonb_array_elements(v_normalized_items)
  loop
    if v_item->>'item_type' = 'product' then
      v_product_items := v_product_items || jsonb_build_array(v_item);
      v_product_original := v_product_original
        + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
      v_product_discount := v_product_discount
        + coalesce((v_item->>'line_discount_amount')::integer, 0);
    elsif v_item->>'item_type' = 'reform' then
      v_reform_items := v_reform_items || jsonb_build_array(v_item);
      v_reform_original := v_reform_original
        + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
      v_reform_discount := v_reform_discount
        + coalesce((v_item->>'line_discount_amount')::integer, 0);
    end if;
  end loop;

  if jsonb_array_length(v_product_items) > 0 then
    v_order_number := generate_order_number();
    v_total_price := v_product_original - v_product_discount;

    insert into orders (
      user_id, order_number, shipping_address_id,
      total_price, original_price, total_discount,
      order_type, status, payment_group_id, shipping_cost
    )
    values (
      v_user_id, v_order_number, p_shipping_address_id,
      v_total_price, v_product_original, v_product_discount,
      'sale', '대기중', v_payment_group_id, 0
    )
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(v_product_items)
    loop
      insert into order_items (
        order_id, item_id, item_type, product_id,
        selected_option_id, item_data, quantity,
        unit_price, discount_amount, line_discount_amount,
        applied_user_coupon_id
      )
      values (
        v_order_id,
        v_item->>'item_id',
        v_item->>'item_type',
        nullif(v_item->>'product_id', '')::integer,
        nullif(v_item->>'selected_option_id', ''),
        case
          when v_item->'reform_data' is null or v_item->'reform_data' = 'null'::jsonb
            then null
          else v_item->'reform_data'
        end,
        (v_item->>'quantity')::integer,
        (v_item->>'unit_price')::integer,
        (v_item->>'discount_amount')::integer,
        coalesce((v_item->>'line_discount_amount')::integer, 0),
        nullif(v_item->>'applied_user_coupon_id', '')::uuid
      );
    end loop;

    v_group_total_amount := v_group_total_amount + v_total_price;
    v_orders_result := v_orders_result || jsonb_build_array(
      jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_type', 'sale'
      )
    );
  end if;

  if jsonb_array_length(v_reform_items) > 0 then
    v_order_number := generate_order_number();
    v_shipping_cost := v_reform_shipping_cost;
    v_total_price := v_reform_original - v_reform_discount + v_shipping_cost;

    insert into orders (
      user_id, order_number, shipping_address_id,
      total_price, original_price, total_discount,
      order_type, status, payment_group_id, shipping_cost
    )
    values (
      v_user_id, v_order_number, p_shipping_address_id,
      v_total_price, v_reform_original, v_reform_discount,
      'repair', '대기중', v_payment_group_id, v_shipping_cost
    )
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(v_reform_items)
    loop
      insert into order_items (
        order_id, item_id, item_type, product_id,
        selected_option_id, item_data, quantity,
        unit_price, discount_amount, line_discount_amount,
        applied_user_coupon_id
      )
      values (
        v_order_id,
        v_item->>'item_id',
        v_item->>'item_type',
        nullif(v_item->>'product_id', '')::integer,
        nullif(v_item->>'selected_option_id', ''),
        case
          when v_item->'reform_data' is null or v_item->'reform_data' = 'null'::jsonb
            then null
          else v_item->'reform_data'
        end,
        (v_item->>'quantity')::integer,
        (v_item->>'unit_price')::integer,
        (v_item->>'discount_amount')::integer,
        coalesce((v_item->>'line_discount_amount')::integer, 0),
        nullif(v_item->>'applied_user_coupon_id', '')::uuid
      );

      v_tie_image := nullif(trim(v_item->'reform_data'->'tie'->>'image'), '');
      v_tie_file_id := nullif(trim(v_item->'reform_data'->'tie'->>'fileId'), '');
      IF v_tie_image IS NOT NULL THEN
        INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
        VALUES (v_tie_image, v_tie_file_id, '/reform', 'reform', v_order_id::text, v_user_id);
      END IF;
    end loop;

    v_group_total_amount := v_group_total_amount + v_total_price;
    v_orders_result := v_orders_result || jsonb_build_array(
      jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_type', 'repair'
      )
    );
  end if;

  if array_length(v_used_coupon_ids, 1) is not null then
    update user_coupons
    set status = 'reserved',
        updated_at = now()
    where user_id = v_user_id
      and status = 'active'
      and id = any(v_used_coupon_ids);
  end if;

  return jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'total_amount', v_group_total_amount,
    'orders', v_orders_result
  );
end;
$$;


ALTER FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") IS 'SECURITY DEFINER: 재고 차감(stock UPDATE)과 결제 그룹 INSERT가 다수 테이블에 걸쳐 수행됨. RLS 정책이 order 소유자 기준으로만 허용하므로 원자적 쓰기를 위해 SECURITY DEFINER 필요. auth.uid() 소유권 검증은 함수 내부에서 수행.';



CREATE OR REPLACE FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[] DEFAULT '{}'::"text"[], "p_additional_notes" "text" DEFAULT ''::"text", "p_contact_name" "text" DEFAULT ''::"text", "p_contact_title" "text" DEFAULT ''::"text", "p_contact_method" "text" DEFAULT 'phone'::"text", "p_contact_value" "text" DEFAULT ''::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_quote_id uuid;
  v_quote_number text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Quantity validation
  if p_quantity is null or p_quantity < 100 then
    raise exception 'Quantity must be 100 or more';
  end if;

  -- Shipping address validation
  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  -- Contact field validation
  if p_contact_name is null or trim(p_contact_name) = '' then
    raise exception 'Contact name is required';
  end if;

  if p_contact_method is null or p_contact_method not in ('email', 'kakao', 'phone') then
    raise exception 'Invalid contact method';
  end if;

  if p_contact_value is null or trim(p_contact_value) = '' then
    raise exception 'Contact value is required';
  end if;

  -- Options validation
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  v_quote_number := public.generate_quote_number();

  insert into public.quote_requests (
    user_id,
    quote_number,
    shipping_address_id,
    options,
    quantity,
    reference_image_urls,
    additional_notes,
    contact_name,
    contact_title,
    contact_method,
    contact_value,
    status
  )
  values (
    v_user_id,
    v_quote_number,
    p_shipping_address_id,
    p_options,
    p_quantity,
    coalesce(p_reference_image_urls, '{}'::text[]),
    coalesce(p_additional_notes, ''),
    trim(p_contact_name),
    coalesce(trim(p_contact_title), ''),
    p_contact_method,
    trim(p_contact_value),
    '요청'
  )
  returning id into v_quote_id;

  return jsonb_build_object(
    'quote_request_id', v_quote_id,
    'quote_number', v_quote_number
  );
end;
$$;


ALTER FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb" DEFAULT '[]'::"jsonb", "p_additional_notes" "text" DEFAULT ''::"text", "p_contact_name" "text" DEFAULT ''::"text", "p_contact_title" "text" DEFAULT ''::"text", "p_contact_method" "text" DEFAULT 'phone'::"text", "p_contact_value" "text" DEFAULT ''::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_quote_id uuid;
  v_quote_number text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Quantity validation
  if p_quantity is null or p_quantity < 100 then
    raise exception 'Quantity must be 100 or more';
  end if;

  -- Shipping address validation
  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  -- Contact field validation
  if p_contact_name is null or trim(p_contact_name) = '' then
    raise exception 'Contact name is required';
  end if;

  if p_contact_method is null or p_contact_method not in ('email', 'kakao', 'phone') then
    raise exception 'Invalid contact method';
  end if;

  if p_contact_value is null or trim(p_contact_value) = '' then
    raise exception 'Contact value is required';
  end if;

  -- Options validation
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  v_quote_number := public.generate_quote_number();

  insert into public.quote_requests (
    user_id,
    quote_number,
    shipping_address_id,
    options,
    quantity,
    reference_images,
    additional_notes,
    contact_name,
    contact_title,
    contact_method,
    contact_value,
    status
  )
  values (
    v_user_id,
    v_quote_number,
    p_shipping_address_id,
    p_options,
    p_quantity,
    coalesce(p_reference_images, '[]'::jsonb),
    coalesce(p_additional_notes, ''),
    trim(p_contact_name),
    coalesce(trim(p_contact_title), ''),
    p_contact_method,
    trim(p_contact_value),
    '요청'
  )
  returning id into v_quote_id;

  -- images 테이블에 참조 이미지 등록
  -- SECURITY DEFINER이므로 RLS bypass. RPC 내부에서 이미 v_user_id := auth.uid() 소유권 검증 완료.
  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/custom-orders',
      'quote_request',
      v_quote_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  return jsonb_build_object(
    'quote_request_id', v_quote_id,
    'quote_number', v_quote_number
  );
end;
$$;


ALTER FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_token_order"("p_plan_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id          uuid;
  v_price_key        text;
  v_amount_key       text;
  v_price            integer;
  v_token_amount     integer;
  v_payment_group_id uuid;
  v_order_number     text;
  v_order_id         uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 플랜 화이트리스트 검증
  IF p_plan_key NOT IN ('starter', 'popular', 'pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key;
  END IF;

  -- pricing_constants에서 가격/수량 조회
  v_price_key  := 'token_plan_' || p_plan_key || '_price';
  v_amount_key := 'token_plan_' || p_plan_key || '_amount';

  SELECT amount INTO v_price
    FROM public.pricing_constants WHERE key = v_price_key;
  SELECT amount INTO v_token_amount
    FROM public.pricing_constants WHERE key = v_amount_key;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'price not configured for plan: %', p_plan_key;
  END IF;
  IF v_token_amount IS NULL OR v_token_amount <= 0 THEN
    RAISE EXCEPTION 'token_amount not configured for plan: %', p_plan_key;
  END IF;

  v_payment_group_id := gen_random_uuid();
  v_order_number     := public.generate_token_order_number();
  v_order_id         := gen_random_uuid();

  INSERT INTO public.orders (
    id, user_id, order_number, shipping_address_id,
    total_price, original_price, total_discount,
    order_type, status, payment_group_id, shipping_cost
  ) VALUES (
    v_order_id, v_user_id, v_order_number, NULL,
    v_price, v_price, 0,
    'token', '대기중', v_payment_group_id, 0
  );

  INSERT INTO public.order_items (
    order_id, item_id, item_type, item_data, quantity, unit_price
  ) VALUES (
    v_order_id, p_plan_key, 'token',
    jsonb_build_object(
      'plan_key',     p_plan_key,
      'token_amount', v_token_amount
    ),
    1, v_price
  );

  RETURN jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'price',            v_price,
    'token_amount',     v_token_amount
  );
END;
$$;


ALTER FUNCTION "public"."create_token_order"("p_plan_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_confirm_purchase"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id        uuid;
  v_current_status text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock the row and verify ownership + status
  select o.status
  into v_current_status
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found or access denied';
  end if;

  if v_current_status not in ('배송완료', '배송중') then
    raise exception '구매확정은 배송중 또는 배송완료 상태에서만 가능합니다 (현재: %)', v_current_status;
  end if;

  if exists (
    select 1
    from public.claims c
    join public.order_items oi on oi.id = c.order_item_id
    where oi.order_id = p_order_id
      and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception '진행 중인 클레임이 있는 주문은 구매확정할 수 없습니다';
  end if;

  update public.orders
  set status       = '완료',
      confirmed_at = now()
  where id = p_order_id;

  -- Audit log (changed_by = customer uid)
  insert into public.order_status_logs (
    order_id,
    changed_by,
    previous_status,
    new_status,
    memo
  )
  values (
    p_order_id,
    v_user_id,
    v_current_status,
    '완료',
    '고객 직접 구매확정'
  );

  return jsonb_build_object('success', true);
end;
$$;


ALTER FUNCTION "public"."customer_confirm_purchase"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_claim_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  claim_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Serialize same-day claim number allocation to prevent duplicates.
  -- Uses 'CLM' prefix in hashtext to avoid collision with generate_order_number().
  perform pg_advisory_xact_lock(hashtext('CLM' || date_str));

  select coalesce(max(cast(substring(claim_number from 14) as integer)), 0) + 1
  into seq_num
  from claims
  where claim_number like 'CLM-' || date_str || '-%';

  claim_num := 'CLM-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return claim_num;
end;
$$;


ALTER FUNCTION "public"."generate_claim_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  order_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Serialize same-day order number allocation to prevent duplicates.
  perform pg_advisory_xact_lock(hashtext(date_str));

  select coalesce(max(cast(substring(order_number from 14) as integer)), 0) + 1
  into seq_num
  from orders
  where order_number like 'ORD-' || date_str || '-%';

  order_num := 'ORD-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return order_num;
end;
$$;


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_quote_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  quote_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Serialize same-day quote number allocation to prevent duplicates.
  -- Uses 'QUO' prefix in hashtext to avoid collision with other generators.
  perform pg_advisory_xact_lock(hashtext('QUO' || date_str));

  select coalesce(max(cast(substring(quote_number from 14) as integer)), 0) + 1
  into seq_num
  from quote_requests
  where quote_number like 'QUO-' || date_str || '-%';

  quote_num := 'QUO-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return quote_num;
end;
$$;


ALTER FUNCTION "public"."generate_quote_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean DEFAULT true) RETURNS SETOF "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  with cart as (
    select *
    from cart_items
    where user_id = p_user_id
      and user_id = auth.uid()
    order by created_at asc
  ),
  product_ids as (
    select array_agg(distinct product_id)::integer[] as ids
    from cart
    where product_id is not null
  ),
  products as (
    select *
    from get_products_by_ids(
      coalesce((select ids from product_ids), '{}'::integer[])
    )
  ),
  coupon_ids as (
    select array_agg(distinct applied_user_coupon_id)::uuid[] as ids
    from cart
    where applied_user_coupon_id is not null
  ),
  coupons as (
    select
      uc.id,
      jsonb_build_object(
        'id', uc.id,
        'userId', uc.user_id,
        'couponId', uc.coupon_id,
        'status', uc.status,
        'issuedAt', uc.issued_at,
        'expiresAt', uc.expires_at,
        'usedAt', uc.used_at,
        'coupon', jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'discountType', c.discount_type,
          'discountValue', c.discount_value,
          'maxDiscountAmount', c.max_discount_amount,
          'description', c.description,
          'expiryDate', c.expiry_date,
          'additionalInfo', c.additional_info
        )
      ) as user_coupon
    from user_coupons uc
    join coupons c on c.id = uc.coupon_id
    where uc.user_id = p_user_id
      and uc.user_id = auth.uid()
      and uc.id = any(coalesce((select ids from coupon_ids), '{}'::uuid[]))
      and (
        not p_active_only
        or (
          uc.status = 'active'
          and (uc.expires_at is null or uc.expires_at > now())
          and c.is_active = true
          and c.expiry_date >= current_date
        )
      )
  )
  select jsonb_build_object(
    'id', cart.item_id,
    'type', cart.item_type,
    'product', case
      when cart.item_type = 'product' then to_jsonb(p)
      else null
    end,
    'selectedOption', case
      when cart.item_type = 'product' and cart.selected_option_id is not null then (
        select option
        from jsonb_array_elements(
          coalesce(to_jsonb(p)->'options', '[]'::jsonb)
        ) option
        where option->>'id' = cart.selected_option_id
        limit 1
      )
      else null
    end,
    'quantity', cart.quantity,
    'reformData', cart.reform_data,
    'appliedCoupon', coupons.user_coupon,
    'appliedCouponId', cart.applied_user_coupon_id
  )
  from cart
  left join products p on p.id = cart.product_id
  left join coupons on coupons.id = cart.applied_user_coupon_id
  order by cart.created_at asc;
$$;


ALTER FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_design_token_balance"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(amount), 0)::integer,
    'paid',  COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    'bonus', COALESCE(SUM(amount) FILTER (WHERE token_class = 'bonus'), 0)::integer
  )
  FROM public.design_tokens
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_design_token_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_design_token_balances_admin"("p_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "balance" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  IF array_length(p_user_ids, 1) > 100 THEN
    RAISE EXCEPTION 'too many user_ids: max 100';
  END IF;

  RETURN QUERY
  WITH requested_users AS (
    SELECT DISTINCT unnest(COALESCE(p_user_ids, ARRAY[]::uuid[])) AS user_id
  ),
  balances AS (
    SELECT dt.user_id, COALESCE(SUM(dt.amount), 0)::integer AS balance
    FROM public.design_tokens AS dt
    JOIN requested_users AS ru
      ON ru.user_id = dt.user_id
    GROUP BY dt.user_id
  )
  SELECT ru.user_id, COALESCE(b.balance, 0)::integer AS balance
  FROM requested_users AS ru
  LEFT JOIN balances AS b
    ON b.user_id = ru.user_id;
END;
$$;


ALTER FUNCTION "public"."get_design_token_balances_admin"("p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) RETURNS TABLE("id" integer, "code" character varying, "name" character varying, "price" integer, "image" "text", "detailImages" "text"[], "category" character varying, "color" character varying, "pattern" character varying, "material" character varying, "info" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "options" "jsonb", "likes" integer, "isLiked" boolean)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images as "detailImages",
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.id::text,
          'name', po.name,
          'additionalPrice', po.additional_price
        )
        order by po.id
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(lc.likes, 0) as likes,
    coalesce(public.product_is_liked_rpc(p.id), false) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join product_like_counts_rpc() lc on lc.product_id = p.id
  where p.id = any (p_ids)
  group by
    p.id, p.code, p.name, p.price, p.image, p.detail_images,
    p.category, p.color, p.pattern, p.material, p.info,
    p.created_at, p.updated_at, lc.likes
  order by p.id;
$$;


ALTER FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_refundable_token_orders"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_result  jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  WITH completed_token_orders AS (
    SELECT
      o.id                                              AS order_id,
      o.order_number,
      o.created_at,
      o.total_price,
      COALESCE((
        SELECT SUM(dt.amount)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (dt.work_id = 'order_' || o.id::text || '_paid'
               OR dt.work_id = 'order_' || o.id::text)
      ), 0)::integer                                    AS paid_tokens_granted,
      COALESCE((
        SELECT MAX(dt.created_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (dt.work_id = 'order_' || o.id::text || '_paid'
               OR dt.work_id = 'order_' || o.id::text)
      ), o.created_at)                                  AS token_granted_at,
      -- 진행 중인 환불 요청 정보 (접수/완료)
      (
        SELECT jsonb_build_object('id', c.id, 'status', c.status)
        FROM public.claims c
        WHERE c.order_id = o.id
          AND c.type = 'token_refund'
          AND c.status IN ('접수', '완료')
        LIMIT 1
      )                                                 AS active_refund_request
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.order_type = 'token'
      AND o.status = '완료'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id',              cto.order_id,
      'order_number',          cto.order_number,
      'created_at',            cto.created_at,
      'total_price',           cto.total_price,
      'paid_tokens_granted',   cto.paid_tokens_granted,
      'bonus_tokens_granted',  0,
      'is_refundable',         CASE
                                 WHEN cto.active_refund_request IS NOT NULL THEN false
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.token_granted_at
                                   ) THEN true
                                 ELSE false
                               END,
      'not_refundable_reason', CASE
                                 WHEN cto.active_refund_request IS NOT NULL THEN
                                   CASE (cto.active_refund_request->>'status')
                                     WHEN '접수' THEN 'pending_refund'
                                     WHEN '완료' THEN 'approved_refund'
                                     ELSE 'active_refund'
                                   END
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.token_granted_at
                                   ) THEN NULL
                                 ELSE 'tokens_used'
                               END,
      'pending_request_id',    CASE
                                 WHEN cto.active_refund_request IS NOT NULL
                                   THEN (cto.active_refund_request->>'id')::uuid
                                 ELSE NULL::uuid
                               END
    )
    ORDER BY cto.created_at DESC
  )
  INTO v_result
  FROM (
    SELECT
      cto.*,
      RANK() OVER (ORDER BY cto.created_at DESC, cto.order_id DESC) AS order_rank
    FROM completed_token_orders cto
  ) cto;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_refundable_token_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_token_plans"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object('key', key, 'value', amount::text)
  )
  INTO v_result
  FROM public.pricing_constants
  WHERE key IN (
    'token_plan_starter_price',  'token_plan_starter_amount',
    'token_plan_popular_price',  'token_plan_popular_amount',
    'token_plan_pro_price',      'token_plan_pro_amount'
  );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_token_plans"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_initial_design_tokens"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_amount integer;
BEGIN
  SELECT CASE
    WHEN value ~ '^[0-9]+$' AND value::integer >= 1 THEN value::integer
    ELSE 30
  END
  INTO v_amount
  FROM public.admin_settings
  WHERE key = 'design_token_initial_grant';

  IF v_amount IS NULL THEN
    v_amount := 30;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, token_class, description)
  VALUES (NEW.id, v_amount, 'grant', 'free', '신규 가입 토큰 지급');

  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."grant_initial_design_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin'::public.user_role, 'manager'::public.user_role)
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order record;
  v_locked_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_already_locked boolean := false;
  v_already_confirmed boolean := false;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  -- service role 경유(Edge Function) 시 auth.uid() = null → skip
  -- 직접 RPC 호출 시 호출자 신원 검증 (IS DISTINCT FROM: NULL 안전 비교)
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

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

    if v_order.status = '대기중' then
      -- 정상 경로: 대기중 → 결제중
      update public.orders
      set status = '결제중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '대기중', '결제중', 'payment lock'
      );

    elsif v_order.status = '결제중' then
      -- 멱등: 이미 lock됨
      v_already_locked := true;

    elsif v_order.status in ('진행중', '접수') then
      -- 이미 결제 완료 상태
      v_already_confirmed := true;

    else
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_locked_orders := v_locked_orders || jsonb_build_object(
      'orderId', v_order.id,
      'orderType', v_order.order_type
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'orders', v_locked_orders,
    'already_locked', v_already_locked,
    'already_confirmed', v_already_confirmed
  );
end;
$$;


ALTER FUNCTION "public"."lock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_description" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_balance integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'amount must not be zero';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'description is required for audit trail';
  END IF;

  IF p_amount < 0 THEN
    -- 차감 경로: 잔액 읽기 전에 advisory lock을 먼저 획득하여
    -- 동시 차감 요청 간의 race condition을 방지한다.
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  END IF;

  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

  IF p_amount < 0 THEN
    IF v_balance < abs(p_amount) THEN
      RAISE EXCEPTION 'insufficient_tokens';
    END IF;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, token_class, description)
  VALUES (p_user_id, p_amount, 'admin', 'paid', p_description);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_balance + p_amount
  );
END;
$$;


ALTER FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_description" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_balance integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'amount must not be zero';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'description is required for audit trail';
  END IF;

  IF p_amount < 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

    SELECT COALESCE(SUM(amount), 0)::integer
      INTO v_balance
      FROM public.design_tokens
     WHERE user_id = p_user_id
       AND (expires_at IS NULL OR expires_at > now());

    IF v_balance < abs(p_amount) THEN
      RAISE EXCEPTION 'insufficient_tokens';
    END IF;
  ELSE
    SELECT COALESCE(SUM(amount), 0)::integer
      INTO v_balance
      FROM public.design_tokens
     WHERE user_id = p_user_id
       AND (expires_at IS NULL OR expires_at > now());
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, description, expires_at)
  VALUES (p_user_id, p_amount, 'admin', p_description, p_expires_at);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_balance + p_amount
  );
END;
$$;


ALTER FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_expires_at" timestamp with time zone, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."product_is_liked_rpc"("p_id" integer) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.product_likes pl
    where pl.product_id = p_id
      and pl.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."product_is_liked_rpc"("p_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."product_like_counts_rpc"() RETURNS TABLE("product_id" integer, "likes" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    pl.product_id,
    count(*)::int as likes
  from public.product_likes pl
  group by pl.product_id;
$$;


ALTER FUNCTION "public"."product_like_counts_rpc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refund_design_tokens"("p_user_id" "uuid", "p_amount" integer, "p_ai_model" "text", "p_request_type" "text", "p_work_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- service_role 전용: 클라이언트 직접 호출 차단
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: refund requires service_role';
  END IF;

  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  -- work_id 기반 멱등성: 동일 work_id로 이미 환불된 경우 무시
  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description, work_id)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')',
    p_work_id
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."refund_design_tokens"("p_user_id" "uuid", "p_amount" integer, "p_ai_model" "text", "p_request_type" "text", "p_work_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_image"("p_url" "text", "p_file_id" "text", "p_folder" "text", "p_entity_type" "text", "p_entity_id" "text", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- SECURITY INVOKER keeps the caller's auth context, so auth.uid() here is the
  -- authenticated caller identity. We verify entity ownership explicitly before
  -- the INSERT, and let the INSERT RLS policy enforce uploaded_by = auth.uid().
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_entity_type = 'product' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'quote_request' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.quote_requests qr
      WHERE qr.id::text = p_entity_id
        AND qr.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'custom_order' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'custom'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'reform' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'repair'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END IF;

  INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at)
  VALUES (p_url, p_file_id, p_folder, p_entity_type, p_entity_id, v_user_id, p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."register_image"("p_url" "text", "p_file_id" "text", "p_folder" "text", "p_entity_type" "text", "p_entity_id" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_cart_items_by_ids"("p_user_id" "uuid", "p_item_ids" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or p_user_id is null then
    raise exception 'unauthorized: authentication required';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized: cart can only be modified for the current user';
  end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 then
    return;
  end if;

  delete from cart_items
  where user_id = p_user_id
    and item_id = any(p_item_ids);
end;
$$;


ALTER FUNCTION "public"."remove_cart_items_by_ids"("p_user_id" "uuid", "p_item_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  item_record jsonb;
  coupon_id_text text;
  quantity_text text;
  quantity_value integer;
begin
  if auth.uid() is null or p_user_id is null then
    raise exception 'unauthorized: authentication required';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized: cart can only be modified for the current user';
  end if;

  -- 동일 유저의 동시 replace_cart_items 호출을 직렬화하여 DELETE+INSERT 인터리빙 방지
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  delete from cart_items where user_id = p_user_id;

  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid p_items: expected a JSON array';
  end if;

  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for item_record in select * from jsonb_array_elements(p_items)
    loop
      coupon_id_text := coalesce(
        item_record->'appliedCoupon'->>'id',
        item_record->>'appliedCouponId'
      );

      quantity_text := item_record->>'quantity';
      if quantity_text is null or quantity_text !~ '^[0-9]+$' then
        raise exception 'invalid quantity: %', coalesce(quantity_text, 'null');
      end if;

      quantity_value := quantity_text::integer;
      if quantity_value <= 0 then
        raise exception 'invalid quantity (must be > 0): %', quantity_text;
      end if;

      insert into cart_items (
        user_id,
        item_id,
        item_type,
        product_id,
        selected_option_id,
        reform_data,
        quantity,
        applied_user_coupon_id
      )
      values (
        p_user_id,
        item_record->>'id',
        (item_record->>'type')::text,
        case
          when item_record->'product' is null then null
          when item_record->'product'->>'id' is null or item_record->'product'->>'id' = 'null' then null
          else (item_record->'product'->>'id')::integer
        end,
        case
          when item_record->'selectedOption' is null then null
          when item_record->'selectedOption'->>'id' is null or item_record->'selectedOption'->>'id' = '' then null
          else item_record->'selectedOption'->>'id'
        end,
        case
          when item_record->'reformData' is null or item_record->'reformData' = 'null'::jsonb then null
          else item_record->'reformData'
        end,
        quantity_value,
        case
          when coupon_id_text is null or coupon_id_text = '' or coupon_id_text = 'null' then null
          else coupon_id_text::uuid
        end
      );
    end loop;
  end if;
end;
$_$;


ALTER FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_product_options"("p_product_id" integer, "p_options" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.product_options
  WHERE product_id = p_product_id;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'p_options must be a JSON array';
  END IF;

  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO public.product_options
      (product_id, name, additional_price, stock)
    SELECT
      p_product_id,
      (elem->>'name')::varchar(255),
      (elem->>'additional_price')::integer,
      CASE WHEN elem->>'stock' IS NULL THEN NULL
           ELSE (elem->>'stock')::integer END
    FROM jsonb_array_elements(p_options) AS elem;
  END IF;
END;
$$;


ALTER FUNCTION "public"."replace_product_options"("p_product_id" integer, "p_options" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_token_refund"("p_order_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id          uuid;
  v_order            record;
  v_latest_order_id  uuid;
  v_paid_granted     integer;
  v_token_granted_at timestamptz;
  v_refund_amount    integer;
  v_token_item_id    uuid;
  v_claim_id         uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 주문 검증: 본인 소유 + 토큰 주문 + 완료 상태
  SELECT id, user_id, total_price, order_type, status, created_at
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     AND user_id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF v_order.order_type != 'token' THEN
    RAISE EXCEPTION 'only token orders can be refunded';
  END IF;

  IF v_order.status != '완료' THEN
    RAISE EXCEPTION 'order is not in completed status (status: %)', v_order.status;
  END IF;

  -- 해당 주문의 유료 지급량 조회
  SELECT
    COALESCE((
      SELECT SUM(dt.amount)
      FROM public.design_tokens dt
      WHERE dt.user_id = v_user_id
        AND dt.type = 'purchase'
        AND dt.token_class = 'paid'
        AND (dt.work_id = 'order_' || p_order_id::text || '_paid'
             OR dt.work_id = 'order_' || p_order_id::text)
    ), 0)::integer
  INTO v_paid_granted;

  IF v_paid_granted <= 0 THEN
    RAISE EXCEPTION 'no paid tokens found for this order';
  END IF;

  SELECT MAX(dt.created_at)
    INTO v_token_granted_at
    FROM public.design_tokens dt
   WHERE dt.user_id = v_user_id
     AND dt.type = 'purchase'
     AND dt.token_class = 'paid'
     AND (dt.work_id = 'order_' || p_order_id::text || '_paid'
          OR dt.work_id = 'order_' || p_order_id::text);

  v_token_granted_at := COALESCE(v_token_granted_at, v_order.created_at);

  SELECT id
    INTO v_latest_order_id
    FROM public.orders
   WHERE user_id = v_user_id
     AND order_type = 'token'
     AND status = '완료'
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  IF v_latest_order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'not the latest order';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.design_tokens dt
    WHERE dt.user_id = v_user_id
      AND dt.type = 'use'
      AND dt.created_at > v_token_granted_at
  ) THEN
    RAISE EXCEPTION 'tokens_used_after_order';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE order_id = p_order_id
      AND type = 'token_refund'
      AND status NOT IN ('거부')
  ) THEN
    RAISE EXCEPTION 'duplicate_refund_request: active refund already exists for this order';
  END IF;

  v_refund_amount := v_order.total_price;

  -- token order_item id 조회
  SELECT oi.id INTO v_token_item_id
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
    AND oi.item_type = 'token'
  ORDER BY oi.created_at
  LIMIT 1;

  IF v_token_item_id IS NULL THEN
    RAISE EXCEPTION '토큰 주문 항목을 찾을 수 없습니다.';
  END IF;

  INSERT INTO public.claims (
    user_id, order_id, order_item_id,
    claim_number, type, status,
    reason, quantity, refund_data
  )
  VALUES (
    v_user_id,
    p_order_id,
    v_token_item_id,
    'TKR-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTR(gen_random_uuid()::text, 1, 4),
    'token_refund',
    '접수',
    COALESCE(p_reason, '토큰 환불 요청'),
    1,
    jsonb_build_object(
      'paid_token_amount', v_paid_granted,
      'bonus_token_amount', 0,
      'refund_amount',      v_refund_amount
    )
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'request_id',         v_claim_id,
    'refund_amount',      v_refund_amount,
    'paid_token_amount',  v_paid_granted,
    'bonus_token_amount', 0
  );
END;
$$;


ALTER FUNCTION "public"."request_token_refund"("p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_image_expiry_on_order_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('완료', '취소') AND OLD.status NOT IN ('완료', '취소') THEN
    UPDATE public.images
    SET expires_at = now() + interval '90 days'
    WHERE entity_id = NEW.id::text
      AND entity_type IN ('custom_order', 'reform')
      AND expires_at IS NULL
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_image_expiry_on_order_complete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_image_expiry_on_quote_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('종료', '확정') AND OLD.status NOT IN ('종료', '확정') THEN
    UPDATE public.images
    SET expires_at = now() + interval '90 days'
    WHERE entity_id = NEW.id::text
      AND entity_type = 'quote_request'
      AND expires_at IS NULL
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_image_expiry_on_quote_complete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order record;
  v_count int := 0;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  -- service role 경유(Edge Function) 시 auth.uid() = null → skip
  -- 직접 RPC 호출 시 호출자 신원 검증 (IS DISTINCT FROM: NULL 안전 비교)
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for v_order in
    select id, user_id, status
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    -- IS DISTINCT FROM: p_user_id가 NULL이어도 안전하게 비교
    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status = '결제중' then
      update public.orders
      set status = '대기중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '결제중', '대기중', 'payment unlock: approval failed'
      );

    elsif v_order.status = '대기중' then
      -- 멱등: 이미 대기중
      null;

    elsif v_order.status in ('진행중', '접수') then
      -- 다른 경로로 이미 confirm됨 — skip
      null;

    end if;
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  -- 결제 실패 시 예약된 쿠폰을 활성 상태로 복원
  update public.user_coupons
  set status = 'active',
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

  return jsonb_build_object('success', true);
end;
$$;


ALTER FUNCTION "public"."unlock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cart_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cart_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."shipping_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipient_name" character varying NOT NULL,
    "recipient_phone" character varying NOT NULL,
    "address" "text" NOT NULL,
    "is_default" boolean NOT NULL,
    "user_id" "uuid" NOT NULL,
    "postal_code" character varying NOT NULL,
    "delivery_memo" "text",
    "address_detail" character varying,
    "delivery_request" "text"
);


ALTER TABLE "public"."shipping_addresses" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_shipping_address"("p_recipient_name" "text", "p_recipient_phone" "text", "p_address" "text", "p_postal_code" "text", "p_is_default" boolean, "p_id" "uuid" DEFAULT NULL::"uuid", "p_address_detail" "text" DEFAULT NULL::"text", "p_delivery_request" "text" DEFAULT NULL::"text", "p_delivery_memo" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."shipping_addresses"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Serialize per-user writes so default-address toggles cannot interleave.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text)::bigint);

  v_id := coalesce(p_id, gen_random_uuid());

  if p_is_default then
    update public.shipping_addresses
    set is_default = false
    where user_id = v_user_id
      and id != v_id;
  end if;

  if p_id is null then
    insert into public.shipping_addresses (
      id,
      user_id,
      recipient_name,
      recipient_phone,
      address,
      address_detail,
      postal_code,
      delivery_request,
      delivery_memo,
      is_default
    )
    values (
      v_id,
      v_user_id,
      p_recipient_name,
      p_recipient_phone,
      p_address,
      p_address_detail,
      p_postal_code,
      p_delivery_request,
      p_delivery_memo,
      p_is_default
    );
  else
    update public.shipping_addresses
    set recipient_name = p_recipient_name,
        recipient_phone = p_recipient_phone,
        address = p_address,
        address_detail = p_address_detail,
        postal_code = p_postal_code,
        delivery_request = p_delivery_request,
        delivery_memo = p_delivery_memo,
        is_default = p_is_default
    where id = v_id
      and user_id = v_user_id;

    if not found then
      raise exception 'Shipping address not found';
    end if;
  end if;

  return query
  select *
  from public.shipping_addresses
  where id = v_id;
end;
$$;


ALTER FUNCTION "public"."upsert_shipping_address"("p_recipient_name" "text", "p_recipient_phone" "text", "p_address" "text", "p_postal_code" "text", "p_is_default" boolean, "p_id" "uuid", "p_address_detail" "text", "p_delivery_request" "text", "p_delivery_memo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cost_key   text;
  v_cost       integer;
  v_balance    integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_cost_key := 'design_token_cost_' || p_ai_model || '_' ||
    CASE p_request_type
      WHEN 'text_and_image' THEN 'image'
      ELSE 'text'
    END;

  SELECT COALESCE(value::integer, 1)
    INTO v_cost
    FROM public.admin_settings
   WHERE key = v_cost_key;

  IF v_cost IS NULL THEN
    v_cost := 1;
  END IF;

  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_balance,
      'cost', v_cost
    );
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description)
  VALUES (
    p_user_id,
    -v_cost,
    'use',
    p_ai_model,
    p_request_type,
    'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_balance - v_cost
  );
END;
$$;


ALTER FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text" DEFAULT 'standard'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cost_key     text;
  v_cost         integer;
  v_total_bal    integer;
  v_paid_bal     integer;
  v_bonus_bal    integer;
  v_caller_role  text;
  v_paid_to_use  integer;
BEGIN
  -- 소유권 검증: service_role이 아닌 경우 auth.uid() 일치 확인
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  -- 파라미터 화이트리스트 검증
  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('text_only', 'text_and_image') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;
  IF p_request_type = 'text_only' AND p_quality = 'high' THEN
    RAISE EXCEPTION 'unsupported combination: text_only with high quality is not supported';
  END IF;

  -- 동시 요청에 대한 advisory lock (사용자별)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- admin_settings에서 비용 조회
  v_cost_key := CASE
    WHEN p_request_type = 'text_and_image' AND p_quality = 'high'
      THEN 'design_token_cost_' || p_ai_model || '_image_high'
    ELSE
      'design_token_cost_' || p_ai_model || '_' ||
      CASE p_request_type
        WHEN 'text_and_image' THEN 'image'
        ELSE 'text'
      END
  END;

  SELECT value::integer
    INTO v_cost
    FROM public.admin_settings
   WHERE key = v_cost_key;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'cost not configured for key: %', v_cost_key;
  END IF;

  -- pending 환불 체크: 구 token_refund_requests 대신 claims 테이블 참조
  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE user_id = p_user_id
      AND type = 'token_refund'
      AND status = '접수'
  ) THEN
    SELECT COALESCE(SUM(amount) FILTER (WHERE token_class IN ('paid', 'bonus')), 0)::integer
      INTO v_total_bal
      FROM public.design_tokens
     WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'refund_pending',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  -- 클래스별 잔액 조회
  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_paid_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class = 'paid';

  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_bonus_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class = 'bonus';

  v_total_bal := v_paid_bal + v_bonus_bal;

  -- 잔액 부족 검사
  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  -- paid 먼저 차감, 부족분은 bonus에서 차감
  v_paid_to_use := least(greatest(v_paid_bal, 0), v_cost);

  IF v_paid_to_use > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -v_paid_to_use, 'use', 'paid',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
    );
  END IF;

  IF v_cost - v_paid_to_use > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -(v_cost - v_paid_to_use), 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_total_bal - v_cost
  );
END;
$$;


ALTER FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text" DEFAULT 'standard'::"text", "p_work_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cost_key     text;
  v_cost         integer;
  v_paid_bal     integer;
  v_bonus_bal    integer;
  v_total_bal    integer;
  v_paid_deduct  integer;
  v_bonus_deduct integer;
  v_caller_role  text;
BEGIN
  -- 소유권 검증
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('text_only', 'text_and_image') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_cost_key := CASE
    WHEN p_request_type = 'text_and_image' AND p_quality = 'high'
      THEN 'design_token_cost_' || p_ai_model || '_image_high'
    ELSE
      'design_token_cost_' || p_ai_model || '_' ||
      CASE p_request_type
        WHEN 'text_and_image' THEN 'image'
        ELSE 'text'
      END
  END;

  SELECT value::integer INTO v_cost
    FROM public.admin_settings WHERE key = v_cost_key;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'cost not configured for key: %', v_cost_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.token_refund_requests
    WHERE user_id = p_user_id AND status = 'pending'
  ) THEN
    SELECT COALESCE(SUM(amount), 0)::integer INTO v_total_bal
      FROM public.design_tokens WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'refund_pending', 'balance', v_total_bal, 'cost', v_cost);
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    COALESCE(SUM(amount) FILTER (WHERE token_class IN ('bonus', 'free')), 0)::integer
  INTO v_paid_bal, v_bonus_bal
  FROM public.design_tokens WHERE user_id = p_user_id;

  v_total_bal := v_paid_bal + v_bonus_bal;

  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tokens', 'balance', v_total_bal, 'cost', v_cost);
  END IF;

  v_paid_deduct  := LEAST(v_cost, v_paid_bal);
  v_bonus_deduct := v_cost - v_paid_deduct;

  -- 유료 차감 (work_id: p_work_id || '_use_paid')
  IF v_paid_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) VALUES (
      p_user_id, -v_paid_deduct, 'use', 'paid',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료',
      CASE WHEN p_work_id IS NOT NULL THEN p_work_id || '_use_paid' ELSE NULL END
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  -- 보너스 차감 (work_id: p_work_id || '_use_bonus')
  IF v_bonus_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) VALUES (
      p_user_id, -v_bonus_deduct, 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 보너스',
      CASE WHEN p_work_id IS NOT NULL THEN p_work_id || '_use_bonus' ELSE NULL END
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal - v_cost);
END;
$$;


ALTER FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text", "p_work_id" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "claim_number" character varying(50) NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT '접수'::"text" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "return_courier_company" "text",
    "return_tracking_number" "text",
    "resend_courier_company" "text",
    "resend_tracking_number" "text",
    "refund_data" "jsonb",
    CONSTRAINT "claims_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "claims_reason_check" CHECK ((("type" = 'token_refund'::"text") OR ("reason" = ANY (ARRAY['change_mind'::"text", 'defect'::"text", 'delay'::"text", 'wrong_item'::"text", 'size_mismatch'::"text", 'color_mismatch'::"text", 'other'::"text"])))),
    CONSTRAINT "claims_status_check" CHECK (("status" = ANY (ARRAY['접수'::"text", '처리중'::"text", '수거요청'::"text", '수거완료'::"text", '재발송'::"text", '완료'::"text", '거부'::"text"]))),
    CONSTRAINT "claims_type_check" CHECK (("type" = ANY (ARRAY['cancel'::"text", 'return'::"text", 'exchange'::"text", 'token_refund'::"text"])))
);


ALTER TABLE "public"."claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "item_id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "product_id" integer,
    "selected_option_id" "text",
    "item_data" "jsonb",
    "quantity" integer NOT NULL,
    "unit_price" integer NOT NULL,
    "discount_amount" integer DEFAULT 0 NOT NULL,
    "applied_user_coupon_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "line_discount_amount" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "order_items_discount_amount_check" CHECK (("discount_amount" >= 0)),
    CONSTRAINT "order_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['product'::"text", 'reform'::"text", 'custom'::"text", 'token'::"text"]))),
    CONSTRAINT "order_items_item_type_content_check" CHECK (((("item_type" = 'product'::"text") AND ("product_id" IS NOT NULL)) OR (("item_type" = 'reform'::"text") AND ("item_data" IS NOT NULL)) OR (("item_type" = 'custom'::"text") AND ("item_data" IS NOT NULL)) OR (("item_type" = 'token'::"text") AND ("item_data" IS NOT NULL)))),
    CONSTRAINT "order_items_line_discount_amount_check" CHECK (("line_discount_amount" >= 0)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_price_check" CHECK (("unit_price" >= 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "shipping_address_id" "uuid",
    "total_price" integer NOT NULL,
    "original_price" integer NOT NULL,
    "total_discount" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT '대기중'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "courier_company" "text",
    "tracking_number" "text",
    "shipped_at" timestamp with time zone,
    "order_type" "text" DEFAULT 'sale'::"text" NOT NULL,
    "delivered_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "company_courier_company" "text",
    "company_tracking_number" "text",
    "company_shipped_at" timestamp with time zone,
    "payment_group_id" "uuid",
    "shipping_cost" integer DEFAULT 0 NOT NULL,
    "payment_key" "text",
    "sample_cost" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "orders_order_type_check" CHECK (("order_type" = ANY (ARRAY['sale'::"text", 'custom'::"text", 'repair'::"text", 'token'::"text"]))),
    CONSTRAINT "orders_original_price_check" CHECK (("original_price" >= 0)),
    CONSTRAINT "orders_sample_cost_check" CHECK (("sample_cost" >= 0)),
    CONSTRAINT "orders_shipping_address_required" CHECK ((("order_type" = 'token'::"text") OR ("shipping_address_id" IS NOT NULL))),
    CONSTRAINT "orders_shipping_cost_check" CHECK (("shipping_cost" >= 0)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['대기중'::"text", '결제중'::"text", '진행중'::"text", '배송중'::"text", '배송완료'::"text", '완료'::"text", '취소'::"text", '실패'::"text", '접수'::"text", '제작중'::"text", '제작완료'::"text", '수선중'::"text", '수선완료'::"text", '샘플원단제작중'::"text", '샘플원단배송중'::"text", '샘플봉제제작중'::"text", '샘플넥타이배송중'::"text", '샘플배송완료'::"text", '샘플승인'::"text"]))),
    CONSTRAINT "orders_total_discount_check" CHECK (("total_discount" >= 0)),
    CONSTRAINT "orders_total_price_check" CHECK (("total_price" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" integer NOT NULL,
    "code" character varying(255),
    "name" character varying(255) NOT NULL,
    "price" integer NOT NULL,
    "image" "text" NOT NULL,
    "category" character varying(50) NOT NULL,
    "color" character varying(50) NOT NULL,
    "pattern" character varying(50) NOT NULL,
    "material" character varying(50) NOT NULL,
    "info" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detail_images" "text"[],
    "stock" integer,
    "option_label" character varying(100),
    CONSTRAINT "products_category_check" CHECK ((("category")::"text" = ANY (ARRAY[('3fold'::character varying)::"text", ('sfolderato'::character varying)::"text", ('knit'::character varying)::"text", ('bowtie'::character varying)::"text"]))),
    CONSTRAINT "products_color_check" CHECK ((("color")::"text" = ANY (ARRAY[('black'::character varying)::"text", ('navy'::character varying)::"text", ('gray'::character varying)::"text", ('wine'::character varying)::"text", ('blue'::character varying)::"text", ('brown'::character varying)::"text", ('beige'::character varying)::"text", ('silver'::character varying)::"text"]))),
    CONSTRAINT "products_material_check" CHECK ((("material")::"text" = ANY (ARRAY[('silk'::character varying)::"text", ('cotton'::character varying)::"text", ('polyester'::character varying)::"text", ('wool'::character varying)::"text"]))),
    CONSTRAINT "products_pattern_check" CHECK ((("pattern")::"text" = ANY (ARRAY[('solid'::character varying)::"text", ('stripe'::character varying)::"text", ('dot'::character varying)::"text", ('check'::character varying)::"text", ('paisley'::character varying)::"text"]))),
    CONSTRAINT "products_price_check" CHECK (("price" >= 0)),
    CONSTRAINT "products_stock_check" CHECK ((("stock" IS NULL) OR ("stock" >= 0)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "phone" character varying,
    "role" "public"."user_role" DEFAULT 'customer'::"public"."user_role" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "birth" "date"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_claim_list_view" WITH ("security_invoker"='true') AS
 SELECT "cl"."id",
    "cl"."user_id" AS "userId",
    "cl"."claim_number" AS "claimNumber",
    "to_char"("cl"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "cl"."status",
    "cl"."type",
    "cl"."reason",
    "cl"."description",
    "cl"."quantity" AS "claimQuantity",
    "cl"."created_at",
    "cl"."updated_at",
    "cl"."return_courier_company" AS "returnCourierCompany",
    "cl"."return_tracking_number" AS "returnTrackingNumber",
    "cl"."resend_courier_company" AS "resendCourierCompany",
    "cl"."resend_tracking_number" AS "resendTrackingNumber",
    "o"."id" AS "orderId",
    "o"."order_number" AS "orderNumber",
    "o"."status" AS "orderStatus",
    "o"."courier_company" AS "orderCourierCompany",
    "o"."tracking_number" AS "orderTrackingNumber",
    "o"."shipped_at" AS "orderShippedAt",
    "p"."name" AS "customerName",
    "p"."phone" AS "customerPhone",
    "oi"."item_type" AS "itemType",
    "pr"."name" AS "productName",
    "cl"."refund_data"
   FROM (((("public"."claims" "cl"
     JOIN "public"."orders" "o" ON (("o"."id" = "cl"."order_id")))
     JOIN "public"."order_items" "oi" ON (("oi"."id" = "cl"."order_item_id")))
     LEFT JOIN "public"."products" "pr" ON (("pr"."id" = "oi"."product_id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "cl"."user_id")));


ALTER TABLE "public"."admin_claim_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_status_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "changed_by" "uuid",
    "previous_status" "text" NOT NULL,
    "new_status" "text" NOT NULL,
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_rollback" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."claim_status_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_claim_status_log_view" AS
 SELECT "l"."id",
    "l"."claim_id" AS "claimId",
    "l"."changed_by" AS "changedBy",
    "l"."previous_status" AS "previousStatus",
    "l"."new_status" AS "newStatus",
    "l"."memo",
    "l"."is_rollback" AS "isRollback",
    "l"."created_at" AS "createdAt"
   FROM "public"."claim_status_logs" "l";


ALTER TABLE "public"."admin_claim_status_log_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_order_detail_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id",
    "o"."user_id" AS "userId",
    "o"."order_number" AS "orderNumber",
    "to_char"("o"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "o"."order_type" AS "orderType",
    "o"."status",
    "o"."total_price" AS "totalPrice",
    "o"."original_price" AS "originalPrice",
    "o"."total_discount" AS "totalDiscount",
    "o"."courier_company" AS "courierCompany",
    "o"."tracking_number" AS "trackingNumber",
    "o"."shipped_at" AS "shippedAt",
    "o"."delivered_at" AS "deliveredAt",
    "o"."confirmed_at" AS "confirmedAt",
    "o"."created_at",
    "o"."updated_at",
    "p"."name" AS "customerName",
    "p"."phone" AS "customerPhone",
    "public"."admin_get_email"("o"."user_id") AS "customerEmail",
    "sa"."recipient_name" AS "recipientName",
    "sa"."recipient_phone" AS "recipientPhone",
    "sa"."address" AS "shippingAddress",
    "sa"."address_detail" AS "shippingAddressDetail",
    "sa"."postal_code" AS "shippingPostalCode",
    "sa"."delivery_memo" AS "deliveryMemo",
    "sa"."delivery_request" AS "deliveryRequest",
    "o"."payment_group_id" AS "paymentGroupId",
    "o"."shipping_cost" AS "shippingCost",
    "o"."sample_cost" AS "sampleCost"
   FROM (("public"."orders" "o"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "o"."user_id")))
     LEFT JOIN "public"."shipping_addresses" "sa" ON (("sa"."id" = "o"."shipping_address_id")));


ALTER TABLE "public"."admin_order_detail_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_order_item_view" WITH ("security_invoker"='true') AS
 SELECT "oi"."id",
    "oi"."order_id" AS "orderId",
    "oi"."item_id" AS "itemId",
    "oi"."item_type" AS "itemType",
    "oi"."product_id" AS "productId",
    "oi"."selected_option_id" AS "selectedOptionId",
    "oi"."item_data" AS "reformData",
    "oi"."quantity",
    "oi"."unit_price" AS "unitPrice",
    "oi"."discount_amount" AS "discountAmount",
    "oi"."line_discount_amount" AS "lineDiscountAmount",
    "oi"."applied_user_coupon_id" AS "appliedUserCouponId",
    "oi"."created_at",
    "pr"."name" AS "productName",
    "pr"."code" AS "productCode",
    "pr"."image" AS "productImage"
   FROM ("public"."order_items" "oi"
     LEFT JOIN "public"."products" "pr" ON (("pr"."id" = "oi"."product_id")));


ALTER TABLE "public"."admin_order_item_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_order_list_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id",
    "o"."user_id" AS "userId",
    "o"."order_number" AS "orderNumber",
    "to_char"("o"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "o"."order_type" AS "orderType",
    "o"."status",
    "o"."total_price" AS "totalPrice",
    "o"."original_price" AS "originalPrice",
    "o"."total_discount" AS "totalDiscount",
    "o"."courier_company" AS "courierCompany",
    "o"."tracking_number" AS "trackingNumber",
    "o"."shipped_at" AS "shippedAt",
    "o"."delivered_at" AS "deliveredAt",
    "o"."confirmed_at" AS "confirmedAt",
    "o"."created_at",
    "o"."updated_at",
    "p"."name" AS "customerName",
    "p"."phone" AS "customerPhone",
    "public"."admin_get_email"("o"."user_id") AS "customerEmail",
        CASE
            WHEN ("o"."order_type" = 'custom'::"text") THEN (("ri"."item_data" -> 'options'::"text") ->> 'fabric_type'::"text")
            ELSE NULL::"text"
        END AS "fabricType",
        CASE
            WHEN ("o"."order_type" = 'custom'::"text") THEN (("ri"."item_data" -> 'options'::"text") ->> 'design_type'::"text")
            ELSE NULL::"text"
        END AS "designType",
        CASE
            WHEN ("o"."order_type" = ANY (ARRAY['custom'::"text", 'repair'::"text"])) THEN "ri"."item_quantity"
            ELSE NULL::integer
        END AS "itemQuantity",
        CASE
            WHEN ("o"."order_type" = 'repair'::"text") THEN ("ri"."item_quantity" || '개 넥타이 수선'::"text")
            ELSE NULL::"text"
        END AS "reformSummary",
    "o"."payment_group_id" AS "paymentGroupId",
    "o"."shipping_cost" AS "shippingCost",
        CASE
            WHEN ("o"."order_type" = 'custom'::"text") THEN (("ri"."item_data" ->> 'sample'::"text"))::boolean
            ELSE NULL::boolean
        END AS "isSample",
        CASE
            WHEN ("o"."order_type" = 'custom'::"text") THEN ("ri"."item_data" ->> 'sample_type'::"text")
            ELSE NULL::"text"
        END AS "sampleType"
   FROM (("public"."orders" "o"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "o"."user_id")))
     LEFT JOIN LATERAL ( SELECT ( SELECT "oi2"."item_data"
                   FROM "public"."order_items" "oi2"
                  WHERE (("oi2"."order_id" = "o"."id") AND ("oi2"."item_type" = ANY (ARRAY['reform'::"text", 'custom'::"text"])))
                 LIMIT 1) AS "item_data",
            ("sum"("oi"."quantity"))::integer AS "item_quantity"
           FROM "public"."order_items" "oi"
          WHERE (("oi"."order_id" = "o"."id") AND ("oi"."item_type" = ANY (ARRAY['reform'::"text", 'custom'::"text"])))) "ri" ON (("o"."order_type" = ANY (ARRAY['custom'::"text", 'repair'::"text"]))));


ALTER TABLE "public"."admin_order_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "changed_by" "uuid",
    "previous_status" "text" NOT NULL,
    "new_status" "text" NOT NULL,
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_rollback" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."order_status_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_order_status_log_view" AS
 SELECT "l"."id",
    "l"."order_id" AS "orderId",
    "l"."changed_by" AS "changedBy",
    "l"."previous_status" AS "previousStatus",
    "l"."new_status" AS "newStatus",
    "l"."memo",
    "l"."is_rollback" AS "isRollback",
    "l"."created_at" AS "createdAt"
   FROM "public"."order_status_logs" "l";


ALTER TABLE "public"."admin_order_status_log_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quote_number" character varying(50) NOT NULL,
    "shipping_address_id" "uuid" NOT NULL,
    "options" "jsonb" NOT NULL,
    "quantity" integer NOT NULL,
    "additional_notes" "text" DEFAULT ''::"text" NOT NULL,
    "contact_name" character varying NOT NULL,
    "contact_title" character varying DEFAULT ''::character varying NOT NULL,
    "contact_method" "text" NOT NULL,
    "contact_value" character varying NOT NULL,
    "status" "text" DEFAULT '요청'::"text" NOT NULL,
    "quoted_amount" integer,
    "quote_conditions" "text",
    "admin_memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "reference_images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "quote_requests_contact_method_check" CHECK (("contact_method" = ANY (ARRAY['email'::"text", 'kakao'::"text", 'phone'::"text"]))),
    CONSTRAINT "quote_requests_quantity_check" CHECK (("quantity" >= 100)),
    CONSTRAINT "quote_requests_quoted_amount_nonneg" CHECK (("quoted_amount" >= 0)),
    CONSTRAINT "quote_requests_status_check" CHECK (("status" = ANY (ARRAY['요청'::"text", '견적발송'::"text", '협의중'::"text", '확정'::"text", '종료'::"text"])))
);


ALTER TABLE "public"."quote_requests" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_quote_request_detail_view" WITH ("security_invoker"='true') AS
 SELECT "qr"."id",
    "qr"."user_id" AS "userId",
    "qr"."quote_number" AS "quoteNumber",
    "to_char"("qr"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "qr"."status",
    "qr"."options",
    "qr"."quantity",
    "qr"."reference_images" AS "referenceImages",
    "qr"."additional_notes" AS "additionalNotes",
    "qr"."contact_name" AS "contactName",
    "qr"."contact_title" AS "contactTitle",
    "qr"."contact_method" AS "contactMethod",
    "qr"."contact_value" AS "contactValue",
    "qr"."quoted_amount" AS "quotedAmount",
    "qr"."quote_conditions" AS "quoteConditions",
    "qr"."admin_memo" AS "adminMemo",
    "qr"."created_at" AS "createdAt",
    "qr"."updated_at" AS "updatedAt",
    "p"."name" AS "customerName",
    "p"."phone" AS "customerPhone",
    "public"."admin_get_email"("qr"."user_id") AS "customerEmail",
    "sa"."recipient_name" AS "recipientName",
    "sa"."recipient_phone" AS "recipientPhone",
    "sa"."address" AS "shippingAddress",
    "sa"."address_detail" AS "shippingAddressDetail",
    "sa"."postal_code" AS "shippingPostalCode",
    "sa"."delivery_memo" AS "deliveryMemo",
    "sa"."delivery_request" AS "deliveryRequest"
   FROM (("public"."quote_requests" "qr"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "qr"."user_id")))
     LEFT JOIN "public"."shipping_addresses" "sa" ON (("sa"."id" = "qr"."shipping_address_id")));


ALTER TABLE "public"."admin_quote_request_detail_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_quote_request_list_view" WITH ("security_invoker"='true') AS
 SELECT "qr"."id",
    "qr"."user_id" AS "userId",
    "qr"."quote_number" AS "quoteNumber",
    "to_char"("qr"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "qr"."status",
    "qr"."quantity",
    "qr"."quoted_amount" AS "quotedAmount",
    "qr"."contact_name" AS "contactName",
    "qr"."contact_title" AS "contactTitle",
    "qr"."contact_method" AS "contactMethod",
    "qr"."contact_value" AS "contactValue",
    "qr"."created_at" AS "createdAt",
    "qr"."updated_at" AS "updatedAt",
    "p"."name" AS "customerName",
    "p"."phone" AS "customerPhone",
    "public"."admin_get_email"("qr"."user_id") AS "customerEmail"
   FROM ("public"."quote_requests" "qr"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "qr"."user_id")));


ALTER TABLE "public"."admin_quote_request_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_request_status_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_request_id" "uuid" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "previous_status" "text" NOT NULL,
    "new_status" "text" NOT NULL,
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_request_status_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_quote_request_status_log_view" WITH ("security_invoker"='true') AS
 SELECT "l"."id",
    "l"."quote_request_id" AS "quoteRequestId",
    "l"."changed_by" AS "changedBy",
    "l"."previous_status" AS "previousStatus",
    "l"."new_status" AS "newStatus",
    "l"."memo",
    "l"."created_at" AS "createdAt"
   FROM "public"."quote_request_status_logs" "l";


ALTER TABLE "public"."admin_quote_request_status_log_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "key" "text" NOT NULL,
    "value" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_coupons_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'used'::"text", 'expired'::"text", 'revoked'::"text", 'reserved'::"text"])))
);


ALTER TABLE "public"."user_coupons" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_user_coupon_view" WITH ("security_invoker"='true') AS
 SELECT "uc"."id",
    "uc"."user_id" AS "userId",
    "uc"."coupon_id" AS "couponId",
    "uc"."status",
    "uc"."issued_at" AS "issuedAt",
    "uc"."expires_at" AS "expiresAt",
    "uc"."used_at" AS "usedAt",
    "p"."name" AS "userName",
        CASE
            WHEN "public"."is_admin"() THEN "p"."phone"
            ELSE NULL::character varying
        END AS "userPhone",
    "public"."admin_get_email"("uc"."user_id") AS "userEmail"
   FROM ("public"."user_coupons" "uc"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "uc"."user_id")))
  WHERE "public"."is_admin"();


ALTER TABLE "public"."admin_user_coupon_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "product_id" integer,
    "selected_option_id" "text",
    "reform_data" "jsonb",
    "quantity" integer NOT NULL,
    "applied_user_coupon_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['product'::"text", 'reform'::"text"]))),
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "cart_items_type_check" CHECK (((("item_type" = 'product'::"text") AND ("product_id" IS NOT NULL) AND ("reform_data" IS NULL)) OR (("item_type" = 'reform'::"text") AND ("product_id" IS NULL) AND ("reform_data" IS NOT NULL))))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "max_discount_amount" numeric(10,2),
    "description" "text",
    "expiry_date" "date" NOT NULL,
    "additional_info" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" > (0)::numeric))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "additional_price" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stock" integer,
    CONSTRAINT "product_options_stock_check" CHECK ((("stock" IS NULL) OR ("stock" >= 0)))
);


ALTER TABLE "public"."product_options" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_list_view" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."code",
    "p"."name",
    "p"."price",
    "p"."image",
    "p"."detail_images" AS "detailImages",
    "p"."category",
    "p"."color",
    "p"."pattern",
    "p"."material",
    "p"."info",
    "p"."stock",
    "p"."option_label" AS "optionLabel",
    "p"."created_at",
    "p"."updated_at",
    COALESCE("jsonb_agg"("jsonb_build_object"('id', ("po"."id")::"text", 'name', "po"."name", 'additionalPrice', "po"."additional_price", 'stock', "po"."stock") ORDER BY "po"."id") FILTER (WHERE ("po"."id" IS NOT NULL)), '[]'::"jsonb") AS "options",
    COALESCE("lc"."likes", 0) AS "likes",
    COALESCE("public"."product_is_liked_rpc"("p"."id"), false) AS "isLiked"
   FROM (("public"."products" "p"
     LEFT JOIN "public"."product_options" "po" ON (("po"."product_id" = "p"."id")))
     LEFT JOIN "public"."product_like_counts_rpc"() "lc"("product_id", "likes") ON (("lc"."product_id" = "p"."id")))
  GROUP BY "p"."id", "p"."code", "p"."name", "p"."price", "p"."image", "p"."detail_images", "p"."category", "p"."color", "p"."pattern", "p"."material", "p"."info", "p"."stock", "p"."option_label", "p"."created_at", "p"."updated_at", "lc"."likes";


ALTER TABLE "public"."product_list_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."claim_list_view" WITH ("security_invoker"='true') AS
 SELECT "cl"."id",
    "cl"."claim_number" AS "claimNumber",
    "to_char"("cl"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "cl"."status",
    "cl"."type",
    "cl"."reason",
    "cl"."description",
    "cl"."quantity" AS "claimQuantity",
    "o"."id" AS "orderId",
    "o"."order_number" AS "orderNumber",
    "to_char"("o"."created_at", 'YYYY-MM-DD'::"text") AS "orderDate",
    "jsonb_build_object"('id', "oi"."item_id", 'type', "oi"."item_type", 'product',
        CASE
            WHEN ("oi"."item_type" = 'product'::"text") THEN "to_jsonb"("p".*)
            ELSE NULL::"jsonb"
        END, 'selectedOption',
        CASE
            WHEN (("oi"."item_type" = 'product'::"text") AND ("oi"."selected_option_id" IS NOT NULL)) THEN ( SELECT "option"."value" AS "option"
               FROM "jsonb_array_elements"(COALESCE(("to_jsonb"("p".*) -> 'options'::"text"), '[]'::"jsonb")) "option"("value")
              WHERE (("option"."value" ->> 'id'::"text") = "oi"."selected_option_id")
             LIMIT 1)
            ELSE NULL::"jsonb"
        END, 'quantity', "oi"."quantity", 'reformData',
        CASE
            WHEN ("oi"."item_type" = ANY (ARRAY['reform'::"text", 'custom'::"text"])) THEN "oi"."item_data"
            ELSE NULL::"jsonb"
        END, 'appliedCoupon', "uc"."user_coupon") AS "item",
    "cl"."refund_data"
   FROM (((("public"."claims" "cl"
     JOIN "public"."orders" "o" ON ((("o"."id" = "cl"."order_id") AND ("o"."user_id" = "auth"."uid"()))))
     JOIN "public"."order_items" "oi" ON (("oi"."id" = "cl"."order_item_id")))
     LEFT JOIN LATERAL ( SELECT "plv"."id",
            "plv"."code",
            "plv"."name",
            "plv"."price",
            "plv"."image",
            "plv"."detailImages",
            "plv"."category",
            "plv"."color",
            "plv"."pattern",
            "plv"."material",
            "plv"."info",
            "plv"."created_at",
            "plv"."updated_at",
            "plv"."options",
            "plv"."likes",
            "plv"."isLiked"
           FROM "public"."product_list_view" "plv"
          WHERE (("oi"."item_type" = 'product'::"text") AND ("oi"."product_id" IS NOT NULL) AND ("plv"."id" = "oi"."product_id"))
         LIMIT 1) "p" ON (true))
     LEFT JOIN LATERAL ( SELECT "uc1"."id",
            "jsonb_build_object"('id', "uc1"."id", 'userId', "uc1"."user_id", 'couponId', "uc1"."coupon_id", 'status', "uc1"."status", 'issuedAt', "uc1"."issued_at", 'expiresAt', "uc1"."expires_at", 'usedAt', "uc1"."used_at", 'coupon', "jsonb_build_object"('id', "cp"."id", 'name', "cp"."name", 'discountType', "cp"."discount_type", 'discountValue', "cp"."discount_value", 'maxDiscountAmount', "cp"."max_discount_amount", 'description', "cp"."description", 'expiryDate', "cp"."expiry_date", 'additionalInfo', "cp"."additional_info")) AS "user_coupon"
           FROM ("public"."user_coupons" "uc1"
             JOIN "public"."coupons" "cp" ON (("cp"."id" = "uc1"."coupon_id")))
          WHERE ("uc1"."id" = "oi"."applied_user_coupon_id")
         LIMIT 1) "uc" ON (true))
  WHERE ("cl"."user_id" = "auth"."uid"());


ALTER TABLE "public"."claim_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "type" "text" NOT NULL,
    "ai_model" "text",
    "request_type" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_id" "text",
    "token_class" "text" NOT NULL,
    CONSTRAINT "design_tokens_amount_check" CHECK (("amount" <> 0)),
    CONSTRAINT "design_tokens_token_class_check" CHECK (("token_class" = ANY (ARRAY['paid'::"text", 'bonus'::"text", 'free'::"text"]))),
    CONSTRAINT "design_tokens_type_check" CHECK (("type" = ANY (ARRAY['grant'::"text", 'use'::"text", 'refund'::"text", 'admin'::"text", 'purchase'::"text"])))
);


ALTER TABLE "public"."design_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "url" "text" NOT NULL,
    "file_id" "text",
    "folder" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "uploaded_by" "uuid",
    "expires_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deletion_claimed_at" timestamp with time zone
);


ALTER TABLE "public"."images" OWNER TO "postgres";


COMMENT ON COLUMN "public"."images"."deletion_claimed_at" IS 'ImageKit 삭제 시도 전 claim 시각. NOT NULL이고 deleted_at IS NULL이면 이전 실행에서 삭제를 시도했으나 DB 업데이트가 실패한 상태이다.';



CREATE TABLE IF NOT EXISTS "public"."inquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "status" "text" DEFAULT '답변대기'::"text" NOT NULL,
    "answer" "text",
    "answer_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT '일반'::"text" NOT NULL,
    "product_id" integer,
    CONSTRAINT "inquiries_answer_pair_check" CHECK (((("answer" IS NULL) AND ("answer_date" IS NULL)) OR (("answer" IS NOT NULL) AND ("answer_date" IS NOT NULL)))),
    CONSTRAINT "inquiries_category_check" CHECK (("category" = ANY (ARRAY['일반'::"text", '상품'::"text", '수선'::"text", '주문제작'::"text"]))),
    CONSTRAINT "inquiries_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 5000))),
    CONSTRAINT "inquiries_product_category_check" CHECK ((("product_id" IS NULL) OR ("category" = '상품'::"text"))),
    CONSTRAINT "inquiries_status_check" CHECK (("status" = ANY (ARRAY['답변대기'::"text", '답변완료'::"text"]))),
    CONSTRAINT "inquiries_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 200)))
);


ALTER TABLE "public"."inquiries" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_detail_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id",
    "o"."order_number" AS "orderNumber",
    "to_char"("o"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "o"."status",
    "o"."total_price" AS "totalPrice",
    "o"."order_type" AS "orderType",
    "o"."courier_company" AS "courierCompany",
    "o"."tracking_number" AS "trackingNumber",
    "o"."shipped_at" AS "shippedAt",
    "o"."delivered_at" AS "deliveredAt",
    "o"."confirmed_at" AS "confirmedAt",
    "o"."created_at",
    "sa"."recipient_name" AS "recipientName",
    "sa"."recipient_phone" AS "recipientPhone",
    "sa"."address" AS "shippingAddress",
    "sa"."address_detail" AS "shippingAddressDetail",
    "sa"."postal_code" AS "shippingPostalCode",
    "sa"."delivery_memo" AS "deliveryMemo",
    "sa"."delivery_request" AS "deliveryRequest"
   FROM ("public"."orders" "o"
     LEFT JOIN "public"."shipping_addresses" "sa" ON (("sa"."id" = "o"."shipping_address_id")))
  WHERE ("o"."user_id" = "auth"."uid"());


ALTER TABLE "public"."order_detail_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_item_view" WITH ("security_invoker"='true') AS
 SELECT "oi"."order_id",
    "oi"."created_at",
    "oi"."item_id" AS "id",
    "oi"."item_type" AS "type",
        CASE
            WHEN ("oi"."item_type" = 'product'::"text") THEN "to_jsonb"("p".*)
            ELSE NULL::"jsonb"
        END AS "product",
        CASE
            WHEN (("oi"."item_type" = 'product'::"text") AND ("oi"."selected_option_id" IS NOT NULL)) THEN ( SELECT "option"."value" AS "option"
               FROM "jsonb_array_elements"(COALESCE(("to_jsonb"("p".*) -> 'options'::"text"), '[]'::"jsonb")) "option"("value")
              WHERE (("option"."value" ->> 'id'::"text") = "oi"."selected_option_id")
             LIMIT 1)
            ELSE NULL::"jsonb"
        END AS "selectedOption",
    "oi"."quantity",
        CASE
            WHEN ("oi"."item_type" = ANY (ARRAY['reform'::"text", 'custom'::"text"])) THEN "oi"."item_data"
            ELSE NULL::"jsonb"
        END AS "reformData",
    "uc"."user_coupon" AS "appliedCoupon"
   FROM ((("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON ((("o"."id" = "oi"."order_id") AND ("o"."user_id" = "auth"."uid"()))))
     LEFT JOIN LATERAL ( SELECT "plv"."id",
            "plv"."code",
            "plv"."name",
            "plv"."price",
            "plv"."image",
            "plv"."detailImages",
            "plv"."category",
            "plv"."color",
            "plv"."pattern",
            "plv"."material",
            "plv"."info",
            "plv"."created_at",
            "plv"."updated_at",
            "plv"."options",
            "plv"."likes",
            "plv"."isLiked"
           FROM "public"."product_list_view" "plv"
          WHERE (("oi"."item_type" = 'product'::"text") AND ("oi"."product_id" IS NOT NULL) AND ("plv"."id" = "oi"."product_id"))
         LIMIT 1) "p" ON (true))
     LEFT JOIN LATERAL ( SELECT "uc1"."id",
            "jsonb_build_object"('id', "uc1"."id", 'userId', "uc1"."user_id", 'couponId', "uc1"."coupon_id", 'status', "uc1"."status", 'issuedAt', "uc1"."issued_at", 'expiresAt', "uc1"."expires_at", 'usedAt', "uc1"."used_at", 'coupon', "jsonb_build_object"('id', "c"."id", 'name', "c"."name", 'discountType', "c"."discount_type", 'discountValue', "c"."discount_value", 'maxDiscountAmount', "c"."max_discount_amount", 'description', "c"."description", 'expiryDate', "c"."expiry_date", 'additionalInfo', "c"."additional_info")) AS "user_coupon"
           FROM ("public"."user_coupons" "uc1"
             JOIN "public"."coupons" "c" ON (("c"."id" = "uc1"."coupon_id")))
          WHERE ("uc1"."id" = "oi"."applied_user_coupon_id")
         LIMIT 1) "uc" ON (true));


ALTER TABLE "public"."order_item_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_list_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id",
    "o"."order_number" AS "orderNumber",
    "to_char"("o"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "o"."status",
    "o"."total_price" AS "totalPrice",
    "o"."order_type" AS "orderType",
    "o"."created_at"
   FROM "public"."orders" "o"
  WHERE ("o"."user_id" = "auth"."uid"());


ALTER TABLE "public"."order_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_constants" (
    "key" "text" NOT NULL,
    "amount" integer NOT NULL,
    "category" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "pricing_constants_amount_check" CHECK (("amount" >= 0)),
    CONSTRAINT "pricing_constants_category_check" CHECK (("category" = ANY (ARRAY['custom_order'::"text", 'fabric'::"text", 'reform'::"text", 'token'::"text"])))
);


ALTER TABLE "public"."pricing_constants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_likes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."products_id_seq" OWNED BY "public"."products"."id";



CREATE OR REPLACE VIEW "public"."quote_request_detail_view" WITH ("security_invoker"='true') AS
 SELECT "qr"."id",
    "qr"."quote_number" AS "quoteNumber",
    "to_char"("qr"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "qr"."status",
    "qr"."options",
    "qr"."quantity",
    "qr"."reference_images" AS "referenceImages",
    "qr"."additional_notes" AS "additionalNotes",
    "qr"."contact_name" AS "contactName",
    "qr"."contact_title" AS "contactTitle",
    "qr"."contact_method" AS "contactMethod",
    "qr"."contact_value" AS "contactValue",
    "qr"."quoted_amount" AS "quotedAmount",
    "qr"."quote_conditions" AS "quoteConditions",
    "qr"."created_at"
   FROM "public"."quote_requests" "qr"
  WHERE ("qr"."user_id" = "auth"."uid"());


ALTER TABLE "public"."quote_request_detail_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."quote_request_list_view" WITH ("security_invoker"='true') AS
 SELECT "qr"."id",
    "qr"."quote_number" AS "quoteNumber",
    "to_char"("qr"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "qr"."status",
    "qr"."quantity",
    "qr"."quoted_amount" AS "quotedAmount",
    "qr"."contact_name" AS "contactName",
    "qr"."contact_method" AS "contactMethod",
    "qr"."created_at"
   FROM "public"."quote_requests" "qr"
  WHERE ("qr"."user_id" = "auth"."uid"());


ALTER TABLE "public"."quote_request_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."token_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "payment_group_id" "uuid" NOT NULL,
    "plan_key" "text" NOT NULL,
    "token_amount" integer NOT NULL,
    "price" integer NOT NULL,
    "status" "text" DEFAULT '대기중'::"text" NOT NULL,
    "payment_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "token_purchases_plan_key_check" CHECK (("plan_key" = ANY (ARRAY['starter'::"text", 'popular'::"text", 'pro'::"text"]))),
    CONSTRAINT "token_purchases_price_check" CHECK (("price" > 0)),
    CONSTRAINT "token_purchases_status_check" CHECK (("status" = ANY (ARRAY['대기중'::"text", '결제중'::"text", '완료'::"text", '실패'::"text"]))),
    CONSTRAINT "token_purchases_token_amount_check" CHECK (("token_amount" > 0))
);


ALTER TABLE "public"."token_purchases" OWNER TO "postgres";


ALTER TABLE ONLY "public"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_unique_user_item" UNIQUE ("user_id", "item_id");



ALTER TABLE ONLY "public"."claim_status_logs"
    ADD CONSTRAINT "claim_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_claim_number_key" UNIQUE ("claim_number");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_tokens"
    ADD CONSTRAINT "design_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_constants"
    ADD CONSTRAINT "pricing_constants_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_request_status_logs"
    ADD CONSTRAINT "quote_request_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_quote_number_key" UNIQUE ("quote_number");



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_purchases"
    ADD CONSTRAINT "token_purchases_payment_group_id_key" UNIQUE ("payment_group_id");



ALTER TABLE ONLY "public"."token_purchases"
    ADD CONSTRAINT "token_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id");



CREATE INDEX "coupons_active_idx" ON "public"."coupons" USING "btree" ("is_active");



CREATE INDEX "coupons_expiry_idx" ON "public"."coupons" USING "btree" ("expiry_date");



CREATE INDEX "idx_cart_items_created_at" ON "public"."cart_items" USING "btree" ("created_at");



CREATE INDEX "idx_cart_items_product_id" ON "public"."cart_items" USING "btree" ("product_id") WHERE ("product_id" IS NOT NULL);



CREATE INDEX "idx_cart_items_user_id" ON "public"."cart_items" USING "btree" ("user_id");



CREATE INDEX "idx_claim_status_logs_claim_id" ON "public"."claim_status_logs" USING "btree" ("claim_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_claims_active_per_item" ON "public"."claims" USING "btree" ("order_item_id", "type") WHERE ("status" = ANY (ARRAY['접수'::"text", '처리중'::"text", '수거요청'::"text", '수거완료'::"text", '재발송'::"text"]));



CREATE INDEX "idx_claims_order_id" ON "public"."claims" USING "btree" ("order_id");



CREATE INDEX "idx_claims_order_item_id" ON "public"."claims" USING "btree" ("order_item_id");



CREATE INDEX "idx_claims_status" ON "public"."claims" USING "btree" ("status");



CREATE INDEX "idx_claims_user_id" ON "public"."claims" USING "btree" ("user_id");



CREATE INDEX "idx_design_tokens_user_class" ON "public"."design_tokens" USING "btree" ("user_id", "token_class");



CREATE INDEX "idx_design_tokens_user_id" ON "public"."design_tokens" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_design_tokens_work_id" ON "public"."design_tokens" USING "btree" ("work_id") WHERE ("work_id" IS NOT NULL);



CREATE INDEX "idx_images_deletion_claimed" ON "public"."images" USING "btree" ("deletion_claimed_at") WHERE (("deletion_claimed_at" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_images_entity" ON "public"."images" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_images_expires" ON "public"."images" USING "btree" ("expires_at") WHERE (("expires_at" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_images_file_id" ON "public"."images" USING "btree" ("file_id") WHERE ("file_id" IS NOT NULL);



CREATE INDEX "idx_inquiries_category" ON "public"."inquiries" USING "btree" ("category");



CREATE INDEX "idx_inquiries_product_id" ON "public"."inquiries" USING "btree" ("product_id");



CREATE INDEX "idx_inquiries_status" ON "public"."inquiries" USING "btree" ("status");



CREATE INDEX "idx_inquiries_user_id" ON "public"."inquiries" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_status_logs_order_id" ON "public"."order_status_logs" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_order_type" ON "public"."orders" USING "btree" ("order_type");



CREATE INDEX "idx_orders_payment_group_id" ON "public"."orders" USING "btree" ("payment_group_id");



CREATE INDEX "idx_orders_pending_confirm_shipping" ON "public"."orders" USING "btree" ("shipped_at") WHERE ("status" = '배송중'::"text");



CREATE INDEX "idx_orders_pending_confirmation" ON "public"."orders" USING "btree" ("delivered_at") WHERE ("status" = '배송완료'::"text");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_product_likes_product_id" ON "public"."product_likes" USING "btree" ("product_id");



CREATE INDEX "idx_product_likes_user_id" ON "public"."product_likes" USING "btree" ("user_id");



CREATE INDEX "idx_product_options_product_id" ON "public"."product_options" USING "btree" ("product_id");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_color" ON "public"."products" USING "btree" ("color");



CREATE INDEX "idx_products_material" ON "public"."products" USING "btree" ("material");



CREATE INDEX "idx_products_pattern" ON "public"."products" USING "btree" ("pattern");



CREATE INDEX "idx_products_price" ON "public"."products" USING "btree" ("price");



CREATE INDEX "idx_quote_request_status_logs_quote_request_id" ON "public"."quote_request_status_logs" USING "btree" ("quote_request_id", "created_at" DESC);



CREATE INDEX "idx_quote_requests_created_at" ON "public"."quote_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_quote_requests_status" ON "public"."quote_requests" USING "btree" ("status");



CREATE INDEX "idx_quote_requests_user_id" ON "public"."quote_requests" USING "btree" ("user_id");



CREATE INDEX "idx_token_purchases_user_id" ON "public"."token_purchases" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "user_coupons_expires_idx" ON "public"."user_coupons" USING "btree" ("expires_at");



CREATE INDEX "user_coupons_status_idx" ON "public"."user_coupons" USING "btree" ("status");



CREATE UNIQUE INDEX "user_coupons_user_coupon_uniq" ON "public"."user_coupons" USING "btree" ("user_id", "coupon_id");



CREATE INDEX "user_coupons_user_id_idx" ON "public"."user_coupons" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "auto_product_code" BEFORE INSERT ON "public"."products" FOR EACH ROW WHEN ((("new"."code" IS NULL) OR (("new"."code")::"text" = ''::"text"))) EXECUTE FUNCTION "public"."auto_generate_product_code"();



CREATE OR REPLACE TRIGGER "cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_cart_items_updated_at"();



CREATE OR REPLACE TRIGGER "coupons_set_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_pricing_constants_updated_at" BEFORE UPDATE ON "public"."pricing_constants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_quote_requests_updated_at" BEFORE UPDATE ON "public"."quote_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_grant_initial_design_tokens" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."grant_initial_design_tokens"();



CREATE OR REPLACE TRIGGER "trg_order_image_expiry" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_image_expiry_on_order_complete"();



CREATE OR REPLACE TRIGGER "trg_quote_request_image_expiry" AFTER UPDATE OF "status" ON "public"."quote_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_image_expiry_on_quote_complete"();



CREATE OR REPLACE TRIGGER "update_admin_settings_updated_at" BEFORE UPDATE ON "public"."admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_claims_updated_at" BEFORE UPDATE ON "public"."claims" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inquiries_updated_at" BEFORE UPDATE ON "public"."inquiries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_token_purchases_updated_at" BEFORE UPDATE ON "public"."token_purchases" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_coupons_set_updated_at" BEFORE UPDATE ON "public"."user_coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_applied_user_coupon_id_fkey" FOREIGN KEY ("applied_user_coupon_id") REFERENCES "public"."user_coupons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_status_logs"
    ADD CONSTRAINT "claim_status_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_status_logs"
    ADD CONSTRAINT "claim_status_logs_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_tokens"
    ADD CONSTRAINT "design_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_applied_user_coupon_id_fkey" FOREIGN KEY ("applied_user_coupon_id") REFERENCES "public"."user_coupons"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."shipping_addresses"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pricing_constants"
    ADD CONSTRAINT "pricing_constants_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_request_status_logs"
    ADD CONSTRAINT "quote_request_status_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_request_status_logs"
    ADD CONSTRAINT "quote_request_status_logs_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."shipping_addresses"("id");



ALTER TABLE ONLY "public"."quote_requests"
    ADD CONSTRAINT "quote_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."token_purchases"
    ADD CONSTRAINT "token_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id");



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admin full access" ON "public"."images" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can answer inquiries" ON "public"."inquiries" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK (("public"."is_admin"() AND ("status" = '답변완료'::"text") AND ("answer" IS NOT NULL) AND ("answer_date" IS NOT NULL)));



CREATE POLICY "Admins can delete coupons" ON "public"."coupons" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete product options" ON "public"."product_options" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete products" ON "public"."products" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert coupons" ON "public"."coupons" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert product options" ON "public"."product_options" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert settings" ON "public"."admin_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert status logs" ON "public"."quote_request_status_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() AND ("changed_by" = "auth"."uid"())));



CREATE POLICY "Admins can insert user coupons" ON "public"."user_coupons" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update all quote requests" ON "public"."quote_requests" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update claim status" ON "public"."claims" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update coupons" ON "public"."coupons" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update order status" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update product options" ON "public"."product_options" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update products" ON "public"."products" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update settings" ON "public"."admin_settings" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update user coupons" ON "public"."user_coupons" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can view all claim status logs" ON "public"."claim_status_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all claims" ON "public"."claims" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all design tokens" ON "public"."design_tokens" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all inquiries" ON "public"."inquiries" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all order status logs" ON "public"."order_status_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all quote requests" ON "public"."quote_requests" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all shipping addresses" ON "public"."shipping_addresses" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all status logs" ON "public"."quote_request_status_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all user coupons" ON "public"."user_coupons" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view settings" ON "public"."admin_settings" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow public read access to product_options" ON "public"."product_options" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Allow read access to coupons" ON "public"."coupons" FOR SELECT USING (true);



CREATE POLICY "Allow service role full access to coupons" ON "public"."coupons" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."shipping_addresses" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."shipping_addresses" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable update for users based on user_id" ON "public"."shipping_addresses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."shipping_addresses" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Public product images" ON "public"."images" FOR SELECT USING (("entity_type" = 'product'::"text"));



CREATE POLICY "Users can create their own claims" ON "public"."claims" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own inquiries" ON "public"."inquiries" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = '답변대기'::"text") AND ("answer" IS NULL) AND ("answer_date" IS NULL)));



CREATE POLICY "Users can create their own order items" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own cart items" ON "public"."cart_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."product_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pending inquiries" ON "public"."inquiries" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = '답변대기'::"text")));



CREATE POLICY "Users can insert own images" ON "public"."images" FOR INSERT TO "authenticated" WITH CHECK (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can insert their own cart items" ON "public"."cart_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."product_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") AND ("role" = 'customer'::"public"."user_role") AND ("is_active" = true)));



CREATE POLICY "Users can insert their own quote requests" ON "public"."quote_requests" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."shipping_addresses" "sa"
  WHERE (("sa"."id" = "quote_requests"."shipping_address_id") AND ("sa"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own cart items" ON "public"."cart_items" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pending inquiries" ON "public"."inquiries" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = '답변대기'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = '답변대기'::"text") AND ("answer" IS NULL) AND ("answer_date" IS NULL)));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") AND ("role" = 'customer'::"public"."user_role") AND ("is_active" = true))) WITH CHECK ((("auth"."uid"() = "id") AND ("role" = 'customer'::"public"."user_role") AND ("is_active" = true)));



CREATE POLICY "Users can view logs of their own claims" ON "public"."claim_status_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."claims" "c"
  WHERE (("c"."id" = "claim_status_logs"."claim_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view logs of their own orders" ON "public"."order_status_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_logs"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view logs of their own quote requests" ON "public"."quote_request_status_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quote_requests" "qr"
  WHERE (("qr"."id" = "quote_request_status_logs"."quote_request_id") AND ("qr"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own images" ON "public"."images" FOR SELECT TO "authenticated" USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can view their own cart items" ON "public"."cart_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own claims" ON "public"."claims" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own design tokens" ON "public"."design_tokens" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own inquiries" ON "public"."inquiries" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own likes" ON "public"."product_likes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own quote requests" ON "public"."quote_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own token purchases" ON "public"."token_purchases" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_update_pricing_constants" ON "public"."pricing_constants" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "allow_public_read_pricing_constants" ON "public"."pricing_constants" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_status_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inquiries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inquiries_service_all" ON "public"."inquiries" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pricing_constants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pricing_constants_service_role_only" ON "public"."pricing_constants" TO "service_role", "postgres" USING (true) WITH CHECK (true);



ALTER TABLE "public"."product_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_request_status_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."token_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_coupons_select_own" ON "public"."user_coupons" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_coupons_service_all" ON "public"."user_coupons" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."admin_bulk_issue_coupons"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_bulk_issue_coupons"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_bulk_issue_coupons"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_email"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_email"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_email"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_period_stats"("p_order_type" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_period_stats"("p_order_type" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_period_stats"("p_order_type" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_today_stats"("p_order_type" "text", "p_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_today_stats"("p_order_type" "text", "p_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_today_stats"("p_order_type" "text", "p_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_revoke_coupons_by_ids"("p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_revoke_coupons_by_ids"("p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_revoke_coupons_by_ids"("p_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_revoke_coupons_by_user_ids"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_revoke_coupons_by_user_ids"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_revoke_coupons_by_user_ids"("p_coupon_id" "uuid", "p_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_claim_status"("p_claim_id" "uuid", "p_new_status" "text", "p_memo" "text", "p_is_rollback" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_claim_status"("p_claim_id" "uuid", "p_new_status" "text", "p_memo" "text", "p_is_rollback" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_claim_status"("p_claim_id" "uuid", "p_new_status" "text", "p_memo" "text", "p_is_rollback" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_memo" "text", "p_is_rollback" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_memo" "text", "p_is_rollback" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_order_tracking"("p_order_id" "uuid", "p_courier_company" "text", "p_tracking_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_order_tracking"("p_order_id" "uuid", "p_courier_company" "text", "p_tracking_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_order_tracking"("p_order_id" "uuid", "p_courier_company" "text", "p_tracking_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_quote_request_status"("p_quote_request_id" "uuid", "p_new_status" "text", "p_quoted_amount" integer, "p_quote_conditions" "text", "p_admin_memo" "text", "p_memo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_quote_request_status"("p_quote_request_id" "uuid", "p_new_status" "text", "p_quoted_amount" integer, "p_quote_conditions" "text", "p_admin_memo" "text", "p_memo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_quote_request_status"("p_quote_request_id" "uuid", "p_new_status" "text", "p_quoted_amount" integer, "p_quote_conditions" "text", "p_admin_memo" "text", "p_memo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_token_refund"("p_request_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_confirm_delivered_orders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_product_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_product_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_product_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_sample_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_sample_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_sample_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_refund_amount"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_refund_amount"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_refund_amount"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_token_refund"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_token_refund"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_token_refund"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid", "p_payment_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_additional_notes" "text", "p_reference_images" "jsonb", "p_shipping_address_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_additional_notes" "text", "p_reference_images" "jsonb", "p_shipping_address_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_options" "jsonb", "p_quantity" integer, "p_sample" boolean, "p_additional_notes" "text", "p_reference_images" "jsonb", "p_shipping_address_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_sample" boolean, "p_sample_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_quote_request_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_images" "jsonb", "p_additional_notes" "text", "p_contact_name" "text", "p_contact_title" "text", "p_contact_method" "text", "p_contact_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_token_order"("p_plan_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_token_order"("p_plan_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_token_order"("p_plan_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_confirm_purchase"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."customer_confirm_purchase"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_confirm_purchase"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_claim_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_claim_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_claim_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_claim_number"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_order_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_quote_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_quote_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_quote_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_design_token_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_design_token_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_design_token_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_design_token_balances_admin"("p_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_design_token_balances_admin"("p_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_design_token_balances_admin"("p_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_refundable_token_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_refundable_token_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_refundable_token_orders"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_token_plans"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_token_plans"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_token_plans"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_token_plans"() TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_initial_design_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."grant_initial_design_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_initial_design_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_expires_at" timestamp with time zone, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_expires_at" timestamp with time zone, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_design_tokens_admin"("p_user_id" "uuid", "p_amount" integer, "p_expires_at" timestamp with time zone, "p_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."product_like_counts_rpc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."product_like_counts_rpc"() TO "anon";
GRANT ALL ON FUNCTION "public"."product_like_counts_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."product_like_counts_rpc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refund_design_tokens"("p_user_id" "uuid", "p_amount" integer, "p_ai_model" "text", "p_request_type" "text", "p_work_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."refund_design_tokens"("p_user_id" "uuid", "p_amount" integer, "p_ai_model" "text", "p_request_type" "text", "p_work_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refund_design_tokens"("p_user_id" "uuid", "p_amount" integer, "p_ai_model" "text", "p_request_type" "text", "p_work_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_image"("p_url" "text", "p_file_id" "text", "p_folder" "text", "p_entity_type" "text", "p_entity_id" "text", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."register_image"("p_url" "text", "p_file_id" "text", "p_folder" "text", "p_entity_type" "text", "p_entity_id" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_image"("p_url" "text", "p_file_id" "text", "p_folder" "text", "p_entity_type" "text", "p_entity_id" "text", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_cart_items_by_ids"("p_user_id" "uuid", "p_item_ids" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_cart_items_by_ids"("p_user_id" "uuid", "p_item_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_cart_items_by_ids"("p_user_id" "uuid", "p_item_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_product_options"("p_product_id" integer, "p_options" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."replace_product_options"("p_product_id" integer, "p_options" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_product_options"("p_product_id" integer, "p_options" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_token_refund"("p_order_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_token_refund"("p_order_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_token_refund"("p_order_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_image_expiry_on_order_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_image_expiry_on_order_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_image_expiry_on_order_complete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_image_expiry_on_quote_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_image_expiry_on_quote_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_image_expiry_on_quote_complete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_payment_orders"("p_payment_group_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cart_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cart_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cart_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."shipping_addresses" TO "anon";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_shipping_address"("p_recipient_name" "text", "p_recipient_phone" "text", "p_address" "text", "p_postal_code" "text", "p_is_default" boolean, "p_id" "uuid", "p_address_detail" "text", "p_delivery_request" "text", "p_delivery_memo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_shipping_address"("p_recipient_name" "text", "p_recipient_phone" "text", "p_address" "text", "p_postal_code" "text", "p_is_default" boolean, "p_id" "uuid", "p_address_detail" "text", "p_delivery_request" "text", "p_delivery_memo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_shipping_address"("p_recipient_name" "text", "p_recipient_phone" "text", "p_address" "text", "p_postal_code" "text", "p_is_default" boolean, "p_id" "uuid", "p_address_detail" "text", "p_delivery_request" "text", "p_delivery_memo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text", "p_work_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text", "p_work_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_design_tokens"("p_user_id" "uuid", "p_ai_model" "text", "p_request_type" "text", "p_quality" "text", "p_work_id" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."claims" TO "anon";
GRANT ALL ON TABLE "public"."claims" TO "authenticated";
GRANT ALL ON TABLE "public"."claims" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("phone") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("role") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("is_active") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("birth") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."admin_claim_list_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_claim_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_claim_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."claim_status_logs" TO "anon";
GRANT ALL ON TABLE "public"."claim_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_status_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_claim_status_log_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_claim_status_log_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_claim_status_log_view" TO "service_role";



GRANT ALL ON TABLE "public"."admin_order_detail_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_order_detail_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_order_detail_view" TO "service_role";



GRANT ALL ON TABLE "public"."admin_order_item_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_order_item_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_order_item_view" TO "service_role";



GRANT ALL ON TABLE "public"."admin_order_list_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_order_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_order_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_logs" TO "anon";
GRANT ALL ON TABLE "public"."order_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_order_status_log_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_order_status_log_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_order_status_log_view" TO "service_role";



GRANT ALL ON TABLE "public"."quote_requests" TO "anon";
GRANT ALL ON TABLE "public"."quote_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_requests" TO "service_role";



GRANT ALL ON TABLE "public"."admin_quote_request_detail_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_quote_request_detail_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_quote_request_detail_view" TO "service_role";



GRANT ALL ON TABLE "public"."admin_quote_request_list_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_quote_request_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_quote_request_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."quote_request_status_logs" TO "anon";
GRANT ALL ON TABLE "public"."quote_request_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_request_status_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_quote_request_status_log_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_quote_request_status_log_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_quote_request_status_log_view" TO "service_role";



GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_coupons" TO "anon";
GRANT ALL ON TABLE "public"."user_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."user_coupons" TO "service_role";



GRANT ALL ON TABLE "public"."admin_user_coupon_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_user_coupon_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_user_coupon_view" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."product_options" TO "anon";
GRANT ALL ON TABLE "public"."product_options" TO "authenticated";
GRANT ALL ON TABLE "public"."product_options" TO "service_role";



GRANT ALL ON TABLE "public"."product_list_view" TO "anon";
GRANT ALL ON TABLE "public"."product_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."product_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."claim_list_view" TO "anon";
GRANT ALL ON TABLE "public"."claim_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."design_tokens" TO "anon";
GRANT ALL ON TABLE "public"."design_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."design_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."images" TO "anon";
GRANT ALL ON TABLE "public"."images" TO "authenticated";
GRANT ALL ON TABLE "public"."images" TO "service_role";



GRANT ALL ON TABLE "public"."inquiries" TO "anon";
GRANT ALL ON TABLE "public"."inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."inquiries" TO "service_role";



GRANT UPDATE("title") ON TABLE "public"."inquiries" TO "authenticated";



GRANT UPDATE("content") ON TABLE "public"."inquiries" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."inquiries" TO "authenticated";



GRANT UPDATE("answer") ON TABLE "public"."inquiries" TO "authenticated";



GRANT UPDATE("answer_date") ON TABLE "public"."inquiries" TO "authenticated";



GRANT UPDATE("category") ON TABLE "public"."inquiries" TO "authenticated";



GRANT UPDATE("product_id") ON TABLE "public"."inquiries" TO "authenticated";



GRANT ALL ON TABLE "public"."order_detail_view" TO "anon";
GRANT ALL ON TABLE "public"."order_detail_view" TO "authenticated";
GRANT ALL ON TABLE "public"."order_detail_view" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_view" TO "anon";
GRANT ALL ON TABLE "public"."order_item_view" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_view" TO "service_role";



GRANT ALL ON TABLE "public"."order_list_view" TO "anon";
GRANT ALL ON TABLE "public"."order_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."order_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_constants" TO "anon";
GRANT ALL ON TABLE "public"."pricing_constants" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_constants" TO "service_role";



GRANT ALL ON TABLE "public"."product_likes" TO "anon";
GRANT ALL ON TABLE "public"."product_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."product_likes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_request_detail_view" TO "anon";
GRANT ALL ON TABLE "public"."quote_request_detail_view" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_request_detail_view" TO "service_role";



GRANT ALL ON TABLE "public"."quote_request_list_view" TO "anon";
GRANT ALL ON TABLE "public"."quote_request_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_request_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."token_purchases" TO "anon";
GRANT ALL ON TABLE "public"."token_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."token_purchases" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
































--
-- Dumped schema changes for auth and storage
--
