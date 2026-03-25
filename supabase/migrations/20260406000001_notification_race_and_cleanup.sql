-- 전화번호 인증 발송 경쟁 상태를 RPC 단일 경로로 직렬화하고
-- 클레임 알림 로그 정리 함수를 추가한다.

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

-- SECURITY DEFINER 사유: pg_cron 또는 service_role이
-- claim_notification_logs 정리 작업을 수행할 수 있어야 한다.
CREATE OR REPLACE FUNCTION public.delete_old_claim_notification_logs(
  p_retention interval DEFAULT interval '90 days'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_deleted_count integer;
begin
  if p_retention <= interval '0 seconds' then
    raise exception 'retention must be positive';
  end if;

  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'unauthorized: scheduler-only function';
  end if;

  with deleted_rows as (
    delete from public.claim_notification_logs
    where created_at < now() - p_retention
    returning 1
  )
  select count(*) into v_deleted_count
  from deleted_rows;

  return v_deleted_count;
end;
$$;

select cron.schedule(
  'delete-old-claim-notification-logs',
  '0 4 * * *',
  $$select public.delete_old_claim_notification_logs();$$
)
where not exists (
  select 1
  from cron.job
  where jobname = 'delete-old-claim-notification-logs'
);
