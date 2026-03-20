-- design chat 직접 쓰기 차단 + repair 결제/송장 검증 보정

DROP POLICY "본인 세션만 생성" ON public.design_chat_sessions;
DROP POLICY "본인 세션만 수정" ON public.design_chat_sessions;
DROP POLICY "본인 세션 메시지만 생성" ON public.design_chat_messages;

-- SECURITY DEFINER 사유:
-- design_chat_* 테이블은 직접 INSERT/UPDATE를 허용하지 않고, 이 RPC만 쓰기 진입점으로 유지한다.
-- auth.uid() 소유권 검증과 세션/메시지 불변식은 함수 내부에서 수행한다.
CREATE OR REPLACE FUNCTION public.save_design_session(
  p_session_id          uuid,
  p_ai_model            text,
  p_first_message       text,
  p_last_image_url      text,
  p_last_image_file_id  text,
  p_messages            jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_session_id uuid := coalesce(p_session_id, gen_random_uuid());
  v_msg jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  SELECT user_id
  INTO v_owner_id
  FROM public.design_chat_sessions
  WHERE id = v_session_id;

  IF v_owner_id IS NOT NULL AND v_owner_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'forbidden: session % is not owned by user', v_session_id;
  END IF;

  INSERT INTO public.design_chat_sessions (
    id, user_id, ai_model, first_message,
    last_image_url, last_image_file_id, image_count, updated_at
  )
  VALUES (
    v_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id,
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) m
      WHERE (m->>'image_url') IS NOT NULL
    ),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET ai_model = EXCLUDED.ai_model,
      first_message = EXCLUDED.first_message,
      last_image_url = EXCLUDED.last_image_url,
      last_image_file_id = EXCLUDED.last_image_file_id,
      image_count = EXCLUDED.image_count,
      updated_at = now()
  WHERE public.design_chat_sessions.user_id = v_user_id;

  FOR v_msg IN
    SELECT *
    FROM jsonb_array_elements(coalesce(p_messages, '[]'::jsonb))
  LOOP
    INSERT INTO public.design_chat_messages (
      id, session_id, role, content,
      image_url, image_file_id, sequence_number
    )
    VALUES (
      (v_msg->>'id')::uuid,
      v_session_id,
      v_msg->>'role',
      COALESCE(v_msg->>'content', ''),
      v_msg->>'image_url',
      v_msg->>'image_file_id',
      (v_msg->>'sequence_number')::int
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_locked_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_already_locked boolean := false;
  v_already_confirmed boolean := false;
begin
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for v_order in
    select id, user_id, status, order_type
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status = '대기중' then
      update public.orders
      set status = '결제중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '대기중', '결제중', 'payment lock'
      );
    elsif v_order.status = '결제중' then
      v_already_locked := true;
    elsif v_order.status in ('진행중', '발송대기', '발송중', '접수', '완료') then
      v_already_confirmed := true;
    else
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_locked_orders := v_locked_orders || jsonb_build_object(
      'orderId', v_order.id,
      'orderType', v_order.order_type
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'orders', v_locked_orders,
    'already_locked', v_already_locked,
    'already_confirmed', v_already_confirmed
  );
end;
$$;

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
    tracking_number = p_tracking_number,
    shipped_at      = now(),
    updated_at      = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_user_id, '발송대기', '발송중',
    '고객 발송 처리: ' || v_courier_code || ' ' || p_tracking_number
  );
end;
$$;
