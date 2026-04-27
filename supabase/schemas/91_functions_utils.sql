-- ============================================================= 
-- 91_functions_utils.sql  – Number generator utilities 
-- =============================================================
-- ── generate_order_number ────────────────────────────────────
-- SECURITY DEFINER 사유: 주문 생성 RPC 내부에서 orders 조회 시
-- 호출자 RLS/권한에 영향을 받지 않고 동일한 번호 시퀀스를 계산하기 위해 사용한다.
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

-- ── set_marketing_consent ────────────────────────────────────
-- SECURITY INVOKER: profiles RLS(id = auth.uid())가 소유권을 보장하며,
-- audit log가 불필요하므로 INVOKER로 충분하다.
CREATE OR REPLACE FUNCTION public.set_marketing_consent(
  p_kakao_sms_consent boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET marketing_kakao_sms_consent = p_kakao_sms_consent
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_marketing_consent(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_marketing_consent(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_marketing_consent(boolean) TO service_role;

-- ── create_phone_verification ───────────────────────────────
-- SECURITY DEFINER 사유: phone_verifications 직접 INSERT 권한을 열지 않고
-- auth.uid() 소유권 검증, 재전송 제한, 일일 횟수 제한을 단일 RPC/트랜잭션으로 강제한다.
CREATE OR REPLACE FUNCTION public.create_phone_verification(
  p_phone text,
  p_today_start timestamptz,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_recent_created_at timestamptz;
  v_today_count integer;
  v_verification_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_phone is null or btrim(p_phone) = '' then
    raise exception '유효하지 않은 휴대폰 번호입니다';
  end if;

  if p_code is null or p_code !~ '^\d{6}$' then
    raise exception '유효하지 않은 인증번호입니다';
  end if;

  perform pg_advisory_xact_lock(hashtext('phone_verification:' || v_user_id::text));

  select created_at
    into v_recent_created_at
  from public.phone_verifications
  where user_id = v_user_id
  order by created_at desc
  limit 1;

  if v_recent_created_at is not null
     and extract(epoch from (now() - v_recent_created_at)) < 60 then
    raise exception '1분 후 재전송 가능합니다';
  end if;

  select count(*)
    into v_today_count
  from public.phone_verifications
  where user_id = v_user_id
    and created_at >= p_today_start;

  if v_today_count >= 5 then
    raise exception '오늘 인증 시도 횟수를 초과했습니다';
  end if;

  insert into public.phone_verifications (
    user_id,
    phone,
    code
  )
  values (
    v_user_id,
    p_phone,
    p_code
  )
  returning id into v_verification_id;

  return jsonb_build_object(
    'id', v_verification_id,
    'code', p_code
  );
end;
$$;

REVOKE ALL ON FUNCTION public.create_phone_verification(text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_phone_verification(text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_phone_verification(text, timestamptz, text) TO service_role;

-- ── generate_quote_number ───────────────────────────────────
-- SECURITY DEFINER 사유: 상위 RPC(create_quote_request 등) SECURITY DEFINER 내부에서
-- quote_requests 테이블을 조회해 번호 시퀀스를 계산하므로 호출자 RLS에 영향받지 않아야 한다.
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
-- SECURITY DEFINER 사유: 상위 RPC(create_claim 등) SECURITY DEFINER 내부에서
-- claims 테이블을 조회해 번호 시퀀스를 계산하므로 호출자 RLS에 영향받지 않아야 한다.
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
