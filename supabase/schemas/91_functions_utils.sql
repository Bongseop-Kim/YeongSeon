-- ============================================================= 
-- 91_functions_utils.sql  – Number generator utilities 
-- =============================================================
-- ── generate_order_number ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- ── generate_token_order_number ─────────────────────────────
-- SECURITY DEFINER 사유: create_token_order SECURITY DEFINER 내부에서 orders 조회 시
-- 호출자 RLS/권한에 영향을 받지 않고 동일한 번호 시퀀스를 계산하기 위해 사용한다.
-- 직접 노출 범위는 authenticated, service_role로 제한한다.
CREATE OR REPLACE FUNCTION public.generate_token_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  order_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Uses 'TKN' prefix in hashtext to avoid collision with other generators.
  perform pg_advisory_xact_lock(hashtext('TKN' || date_str));

  -- 순번 파싱 대상을 순번 형식(숫자)으로 생성된 것만 포함
  select coalesce(max(cast(substring(order_number from 14) as integer)), 0) + 1
  into seq_num
  from orders
  where order_number like 'TKN-' || date_str || '-%'
    and order_number ~ '^TKN-\d{8}-\d+$';

  order_num := 'TKN-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return order_num;
end;
$$;

REVOKE ALL ON FUNCTION public.generate_token_order_number() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_token_order_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_token_order_number() TO service_role;

-- ── set_notification_preferences ────────────────────────────
-- SECURITY DEFINER 사유: profiles.notification_* 직접 UPDATE 권한을 열지 않고
-- auth.uid() 소유권 검증 + 감사 로그 기록을 강제하기 위해 RPC 단일 경로로 제한한다.
CREATE OR REPLACE FUNCTION public.set_notification_preferences(
  p_notification_consent boolean DEFAULT NULL,
  p_notification_enabled boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id               uuid;
  v_current_consent       boolean;
  v_current_enabled       boolean;
  v_next_consent          boolean;
  v_next_enabled          boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select notification_consent, notification_enabled
    into v_current_consent, v_current_enabled
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_next_consent := coalesce(p_notification_consent, v_current_consent);
  v_next_enabled := coalesce(p_notification_enabled, v_current_enabled);

  if v_next_consent = v_current_consent
     and v_next_enabled = v_current_enabled then
    return;
  end if;

  update public.profiles
  set notification_consent = v_next_consent,
      notification_enabled = v_next_enabled
  where id = v_user_id;

  insert into public.notification_preference_logs (
    user_id,
    previous_notification_consent,
    new_notification_consent,
    previous_notification_enabled,
    new_notification_enabled
  )
  values (
    v_user_id,
    v_current_consent,
    v_next_consent,
    v_current_enabled,
    v_next_enabled
  );
end;
$$;

REVOKE ALL ON FUNCTION public.set_notification_preferences(boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_notification_preferences(boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_preferences(boolean, boolean) TO service_role;

-- ── generate_quote_number ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- ── generate_claim_number ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
