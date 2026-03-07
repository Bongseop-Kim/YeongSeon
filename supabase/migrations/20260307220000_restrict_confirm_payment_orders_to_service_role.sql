-- confirm_payment_orders: anon/authenticated 실행 권한 제거, service_role 전용으로 제한
-- 이 함수는 Edge Function(service_role)을 통해서만 호출되어야 하므로
-- 일반 클라이언트(anon/authenticated)가 직접 RPC 호출하는 경로를 차단한다.
REVOKE ALL ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) TO service_role;
