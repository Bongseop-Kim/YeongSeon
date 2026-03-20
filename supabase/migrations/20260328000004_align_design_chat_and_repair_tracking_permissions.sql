GRANT EXECUTE ON FUNCTION public.save_design_session(uuid, text, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lock_payment_orders(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_payment_orders(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_repair_tracking(
  p_order_id uuid,
  p_courier_company text,
  p_tracking_number text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order record;
  v_courier_code text;
  v_tracking_number text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_courier_company is null or trim(p_courier_company) = '' then
    raise exception '택배사를 선택해주세요';
  end if;

  v_courier_code := lower(trim(p_courier_company));
  if v_courier_code not in ('cj', 'hanjin', 'logen', 'epost', 'lotte', 'kyungdong') then
    raise exception '지원하지 않는 택배사 코드입니다: % (허용 값: cj, hanjin, logen, epost, lotte, kyungdong)', p_courier_company;
  end if;

  if p_tracking_number is null or trim(p_tracking_number) = '' then
    raise exception '송장번호를 입력해주세요';
  end if;

  v_tracking_number := trim(p_tracking_number);

  select id, user_id, status
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception '주문을 찾을 수 없습니다';
  end if;

  if v_order.user_id is distinct from v_user_id then
    raise exception 'Forbidden';
  end if;

  if v_order.status != '발송대기' then
    raise exception '발송대기 상태에서만 송장번호를 등록할 수 있습니다 (현재 상태: %)', v_order.status;
  end if;

  update public.orders
  set
    status          = '발송중',
    courier_company = v_courier_code,
    tracking_number = v_tracking_number,
    shipped_at      = now(),
    updated_at      = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_user_id, '발송대기', '발송중',
    '고객 발송 처리: ' || v_courier_code || ' ' || v_tracking_number
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.submit_repair_tracking(uuid, text, text) TO authenticated;
