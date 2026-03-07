-- =============================================================
-- 코드 리뷰 버그픽스 (4건)
--
-- 1. profiles: column-level UPDATE 권한 누락 복구
--    (REVOKE TABLE-level은 원격에 이미 적용됨, column-level GRANT만 누락)
-- 2. inquiries: column-level UPDATE 권한 누락 복구
--    (동일 패턴)
-- 3. auto_confirm_delivered_orders: anon/authenticated 실행 권한 제거
--    (scheduler-only 함수이므로 service_role 전용으로 제한)
-- 4. create_custom_order_txn: payment_group_id 누락으로 결제 플로우 불가 수정
-- =============================================================

-- ── 1. profiles column-level UPDATE 복구 ─────────────────────
GRANT UPDATE (name, phone, birth) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (role, is_active) ON TABLE public.profiles TO authenticated;

-- ── 2. inquiries column-level UPDATE 복구 ────────────────────
GRANT UPDATE (title, content) ON TABLE public.inquiries TO authenticated;
GRANT UPDATE (status, answer, answer_date) ON TABLE public.inquiries TO authenticated;

-- ── 3. auto_confirm_delivered_orders 권한 제한 ────────────────
REVOKE ALL ON FUNCTION public.auto_confirm_delivered_orders() FROM anon, authenticated;

-- ── 4. create_custom_order_txn: payment_group_id 추가 ─────────
CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_image_urls text[] DEFAULT '{}'::text[],
  p_additional_notes text DEFAULT '',
  p_sample boolean DEFAULT false,
  p_sample_type text DEFAULT null
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
  v_sewing_cost integer;
  v_fabric_cost integer;
  v_total_cost integer;
  v_reform_data jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- p_sample / p_sample_type 정합성 검증
  if p_sample is not true and p_sample_type is not null then
    raise exception 'p_sample_type must be null when p_sample is not true';
  end if;

  if p_sample is true and (p_sample_type is null or trim(p_sample_type) = '') then
    raise exception 'p_sample_type is required when p_sample is true';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  select
    amounts.sewing_cost,
    amounts.fabric_cost,
    amounts.total_cost
  into
    v_sewing_cost,
    v_fabric_cost,
    v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity) as amounts;

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
    v_total_cost,
    v_total_cost,
    0,
    'custom',
    '대기중',
    v_payment_group_id
  )
  returning id into v_order_id;

  v_reform_data := jsonb_build_object(
    'custom_order', true,
    'quantity', p_quantity,
    'options', p_options,
    'reference_image_urls', to_jsonb(coalesce(p_reference_image_urls, '{}'::text[])),
    'additional_notes', coalesce(p_additional_notes, ''),
    'sample', coalesce(p_sample, false),
    'sample_type', p_sample_type,
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'total_cost', v_total_cost
    )
  );

  insert into public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    selected_option_id,
    reform_data,
    quantity,
    unit_price,
    discount_amount,
    line_discount_amount,
    applied_user_coupon_id
  )
  values (
    v_order_id,
    'custom-order-' || v_order_id::text,
    'reform',
    null,
    null,
    v_reform_data,
    p_quantity,
    floor(v_total_cost::numeric / p_quantity)::integer,
    0,
    0,
    null
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;
