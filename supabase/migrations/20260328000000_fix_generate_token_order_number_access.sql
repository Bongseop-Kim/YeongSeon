-- generate_token_order_number 권한/주석 정렬
-- 기존 마이그레이션 수정 대신 후속 마이그레이션으로 보정한다.
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

  -- SECURITY DEFINER 사유:
  -- create_token_order SECURITY DEFINER 내부에서 orders 조회 시
  -- 호출자 RLS/권한과 무관하게 동일한 일자별 토큰 주문 번호를 계산한다.
  perform pg_advisory_xact_lock(hashtext('TKN' || date_str));

  select coalesce(max(cast(substring(order_number from 14) as integer)), 0) + 1
  into seq_num
  from public.orders
  where order_number like 'TKN-' || date_str || '-%'
    and order_number ~ '^TKN-\d{8}-\d+$';

  order_num := 'TKN-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return order_num;
end;
$$;

REVOKE ALL ON FUNCTION public.generate_token_order_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_token_order_number() FROM anon;
GRANT ALL ON FUNCTION public.generate_token_order_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_token_order_number() TO service_role;
