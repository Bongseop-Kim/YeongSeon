-- cancel_claim: 접수 상태의 클레임을 유저가 직접 취소(삭제)한다.
CREATE OR REPLACE FUNCTION public.cancel_claim(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
-- SECURITY DEFINER: claims 테이블에 authenticated 역할의 DELETE RLS 정책이
-- 의도적으로 존재하지 않는다. 직접 DELETE를 허용하면 상태 검증 없이
-- 레코드가 삭제될 수 있으므로, 이 함수를 통해서만 소유권·상태 검증 후
-- 삭제를 허용한다. DELETE RLS 정책을 추가하더라도 이 함수를 유지한다.
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_status  text;
  v_type    text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select status, type into v_status, v_type
  from public.claims
  where id = p_claim_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  -- token_refund는 create_claim으로 생성되지 않으며 별도 환불 흐름으로 관리된다.
  if v_type = 'token_refund' then
    raise exception 'token_refund 클레임은 직접 취소할 수 없습니다';
  end if;

  if v_status <> '접수' then
    raise exception '접수 상태에서만 클레임을 취소할 수 있습니다';
  end if;

  delete from public.claims where id = p_claim_id;
  -- claim_status_logs는 ON DELETE CASCADE로 자동 삭제
end;
$$;
