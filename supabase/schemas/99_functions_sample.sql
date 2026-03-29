-- =============================================================
-- 99_functions_sample.sql  – Sample order RPC functions
-- =============================================================

-- SECURITY DEFINER 사용 근거: user_coupons UPDATE(쿠폰 reserved 처리)를 위해 필요.
-- auth.uid() 소유권 검증 및 shipping_addresses 존재 확인으로 권한 남용을 방지한다.
CREATE OR REPLACE FUNCTION public.create_sample_order_txn(
  p_shipping_address_id uuid,
  p_sample_type text,
  p_options jsonb,
  p_reference_images jsonb DEFAULT '[]'::jsonb,
  p_additional_notes text DEFAULT '',
  p_user_coupon_id uuid DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_payment_group_id uuid;
  v_total_cost integer;
  v_item_data jsonb;
  v_design_type text;
  v_elem jsonb;
  v_idx integer;

  -- 쿠폰 관련 변수
  v_coupon record;
  v_discount_amount integer := 0;
  v_line_discount_total integer := 0;
  v_total_price integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_sample_type not in ('fabric', 'sewing', 'fabric_and_sewing') then
    raise exception 'Invalid p_sample_type: %', p_sample_type;
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if p_reference_images is not null and jsonb_typeof(p_reference_images) <> 'array' then
    raise exception 'p_reference_images must be a JSON array';
  end if;

  v_idx := 0;
  if p_reference_images is not null then
    for v_elem in select jsonb_array_elements(p_reference_images) loop
      if jsonb_typeof(v_elem) <> 'object'
         or not (v_elem ? 'url')
         or jsonb_typeof(v_elem->'url') <> 'string'
         or btrim(coalesce(v_elem->>'url', '')) = ''
         or ((v_elem ? 'file_id') and jsonb_typeof(v_elem->'file_id') not in ('string', 'null')) then
        raise exception 'p_reference_images[%] must be an object with a non-empty string "url" and optional string/null "file_id"', v_idx;
      end if;
      v_idx := v_idx + 1;
    end loop;
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  v_design_type := p_options->>'design_type';

  if p_sample_type in ('fabric', 'fabric_and_sewing')
     and v_design_type not in ('PRINTING', 'YARN_DYED') then
    raise exception 'Invalid design_type for sample order: %', v_design_type;
  end if;

  select pc.amount
  into v_total_cost
  from public.pricing_constants pc
  where pc.key = case p_sample_type
    when 'sewing' then 'SAMPLE_SEWING_COST'
    when 'fabric' then
      case v_design_type
        when 'PRINTING' then 'SAMPLE_FABRIC_PRINTING_COST'
        else                 'SAMPLE_FABRIC_YARN_DYED_COST'
      end
    else -- fabric_and_sewing
      case v_design_type
        when 'PRINTING' then 'SAMPLE_FABRIC_AND_SEWING_PRINTING_COST'
        else                 'SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST'
      end
  end;

  if v_total_cost is null then
    raise exception 'Sample pricing constant is not configured';
  end if;

  -- 쿠폰 검증 및 할인 계산 (unit_price = v_total_cost, qty = 1)
  if p_user_coupon_id is not null then
    select
      uc.id, uc.status, uc.expires_at,
      c.discount_type, c.discount_value, c.max_discount_amount,
      c.expiry_date, c.is_active
    into v_coupon
    from public.user_coupons uc
    join public.coupons c on c.id = uc.coupon_id
    where uc.id = p_user_coupon_id
      and uc.user_id = v_user_id
    for update;

    if not found then
      raise exception 'Coupon not found';
    end if;
    if v_coupon.status <> 'active' then
      raise exception 'Coupon is not available';
    end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
      raise exception 'Coupon has expired';
    end if;
    if coalesce(v_coupon.is_active, false) is not true then
      raise exception 'Coupon is not active';
    end if;
    if v_coupon.expiry_date is not null and v_coupon.expiry_date < current_date then
      raise exception 'Coupon has expired';
    end if;

    -- qty=1이므로 라인 할인 = 단위 할인
    if v_coupon.discount_type = 'percentage' then
      v_discount_amount := floor(v_total_cost * (v_coupon.discount_value::numeric / 100.0))::integer;
    elsif v_coupon.discount_type = 'fixed' then
      v_discount_amount := floor(v_coupon.discount_value::numeric)::integer;
    else
      raise exception 'Invalid coupon type';
    end if;

    v_discount_amount := greatest(0, least(v_discount_amount, v_total_cost));
    v_line_discount_total := v_discount_amount;
    if v_coupon.max_discount_amount is not null then
      v_line_discount_total := least(v_line_discount_total, v_coupon.max_discount_amount);
    end if;
  end if;

  v_total_price := v_total_cost - v_line_discount_total;

  v_order_number := public.generate_order_number();
  v_payment_group_id := gen_random_uuid();

  insert into public.orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    order_type,
    status,
    payment_group_id
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_price,
    v_total_cost,
    v_line_discount_total,
    'sample',
    '대기중',
    v_payment_group_id
  )
  returning id into v_order_id;

  v_item_data := jsonb_build_object(
    'sample_type', p_sample_type,
    'options', coalesce(p_options, '{}'::jsonb),
    'reference_images', coalesce(p_reference_images, '[]'::jsonb),
    'additional_notes', coalesce(p_additional_notes, ''),
    'pricing', jsonb_build_object(
      'total_cost', v_total_cost
    )
  );

  insert into public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    selected_option_id,
    item_data,
    quantity,
    unit_price,
    discount_amount,
    line_discount_amount,
    applied_user_coupon_id
  )
  values (
    v_order_id,
    'sample-order-' || v_order_id::text,
    'sample',
    null,
    null,
    v_item_data,
    1,
    v_total_cost,
    v_line_discount_total,
    v_line_discount_total,
    p_user_coupon_id
  );

  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/sample-orders',
      'sample_order',
      v_order_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  -- 쿠폰 reserved 처리
  if p_user_coupon_id is not null then
    update public.user_coupons
    set status = 'reserved',
        updated_at = now()
    where id = p_user_coupon_id
      and user_id = v_user_id
      and status = 'active';
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;
