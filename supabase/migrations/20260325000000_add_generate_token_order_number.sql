-- generate_token_order_number was missing from the squash migration
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
GRANT ALL ON FUNCTION public.generate_token_order_number() TO anon;
GRANT ALL ON FUNCTION public.generate_token_order_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_token_order_number() TO service_role;
