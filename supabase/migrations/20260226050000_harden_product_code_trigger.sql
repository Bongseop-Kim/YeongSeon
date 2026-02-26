-- Harden auto_generate_product_code:
-- 1. Filter out non-numeric suffixes before casting to integer
-- 2. Raise exception when sequence exceeds 999 (3-digit overflow)
CREATE OR REPLACE FUNCTION public.auto_generate_product_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Advisory lock to prevent concurrent sequence gaps
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
$$;
