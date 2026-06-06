-- 송장 등록 택배사 허용 목록 완화
-- 택배사 목록(편의점 택배 등 추가)은 프론트 상수(@yeongseon/shared courier-companies)가
-- 단일 소스이므로, submit_repair_tracking은 코드 형식(소문자 영문/숫자, 30자 이내)만 검증한다.

CREATE OR REPLACE FUNCTION public.submit_repair_tracking(
  p_order_id uuid,
  p_courier_company text,
  p_tracking_number text,
  p_photos jsonb DEFAULT '[]'::jsonb
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
  v_photos jsonb;
  v_photo jsonb;
  v_photo_url text;
  v_photo_file_id text;
  v_photo_row_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_courier_company is null or trim(p_courier_company) = '' then
    raise exception '택배사를 선택해주세요';
  end if;

  -- 택배사 목록은 프론트 상수(@yeongseon/shared courier-companies)가 단일 소스.
  -- 서버는 코드 형식만 검증한다 (소문자 영문/숫자, 30자 이내).
  v_courier_code := lower(trim(p_courier_company));
  if v_courier_code !~ '^[a-z0-9_-]{1,30}$' then
    raise exception '올바르지 않은 택배사 코드입니다: %', p_courier_company;
  end if;

  if p_tracking_number is null or trim(p_tracking_number) = '' then
    raise exception '송장번호를 입력해주세요';
  end if;

  v_tracking_number := trim(p_tracking_number);

  v_photos := coalesce(p_photos, '[]'::jsonb);
  if jsonb_typeof(v_photos) <> 'array' then
    raise exception '발송 사진 형식이 올바르지 않습니다';
  end if;
  if jsonb_array_length(v_photos) > 3 then
    raise exception '발송 사진은 최대 3장까지 첨부할 수 있습니다';
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

  -- 발송 사진: 업로드 시 등록된 repair_shipping_upload 이미지를 주문에 연결
  if jsonb_array_length(v_photos) > 0 then
    for v_photo in select * from jsonb_array_elements(v_photos)
    loop
      v_photo_url := nullif(trim(coalesce(v_photo->>'url', '')), '');
      v_photo_file_id := nullif(trim(coalesce(v_photo->>'fileId', '')), '');
      if v_photo_url is null or v_photo_file_id is null then
        raise exception '발송 사진 정보가 올바르지 않습니다';
      end if;

      update public.images
      set folder = '/repair-shipping',
          entity_type = 'repair_shipping',
          entity_id = p_order_id::text
      where entity_type = 'repair_shipping_upload'
        and entity_id = v_photo_file_id
        and file_id = v_photo_file_id
        and url = v_photo_url
        and uploaded_by = v_user_id;

      get diagnostics v_photo_row_count = row_count;
      if v_photo_row_count = 0 then
        raise exception 'Repair shipping photo not found or not owned';
      end if;
    end loop;

    insert into public.repair_shipping_receipts (
      order_id, receipt_type, photos
    ) values (
      p_order_id, 'tracking', v_photos
    );
  end if;
end;
$$;
