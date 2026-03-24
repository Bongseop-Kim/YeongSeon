-- P2-b: role, is_active 컬럼은 관리자 RPC에서만 변경해야 하므로
-- authenticated 역할에 대한 직접 UPDATE 권한을 제거한다.
-- SECURITY DEFINER 함수는 함수 소유자 권한으로 실행되므로 영향 없음.
REVOKE UPDATE (role, is_active) ON TABLE public.profiles FROM authenticated;
