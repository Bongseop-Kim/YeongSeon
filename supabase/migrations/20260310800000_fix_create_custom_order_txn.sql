CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_options        jsonb,
  p_quantity       integer,
  p_sample         boolean,
  p_additional_notes text,
  p_reference_images jsonb,
  p_shipping_address_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
-- SECURITY DEFINER: required to bypass RLS on order_items (INSERT policy checks order ownership, not item ownership)
SET search_path TO 'public'
AS $$
declare
  v_user_id            uuid := auth.uid();
  v_order_id           uuid;
  v_order_number       text;
  v_payment_group_id   uuid := gen_random_uuid();
  v_sewing_cost        integer;
  v_fabric_cost        integer;
  v_total_cost         integer;
  v_base_unit          integer;
  v_reform_data        jsonb;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- guard 1: quantity must be positive
  if p_quantity <= 0 then
    raise exception 'p_quantity must be greater than 0';
  end if;

  -- guard 2: shipping address ownership
  if not exists (
    select 1 from public.shipping_addresses
    where id = p_shipping_address_id
      and user_id = v_user_id
  ) then
    raise exception 'Shipping address not found or access denied';
  end if;

  select sewing_cost, fabric_cost, total_cost
    into v_sewing_cost, v_fabric_cost, v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity);

  v_base_unit := v_total_cost / p_quantity;

  v_reform_data := jsonb_build_object(
    'options', p_options,
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'total_cost', v_total_cost
    ),
    'quantity', p_quantity,
    'sample', p_sample,
    'additional_notes', p_additional_notes,
    'reference_images', coalesce(p_reference_images, '[]'::jsonb)
  );

  v_order_number := 'C' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));

  insert into public.orders (
    user_id, order_number, order_type, status,
    total_price, original_price, total_discount,
    shipping_address_id, payment_group_id, shipping_cost
  )
  values (
    v_user_id, v_order_number, 'custom', '대기중',
    v_total_cost, v_total_cost, 0,
    p_shipping_address_id, v_payment_group_id, 0
  )
  returning id into v_order_id;

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
    'custom',
    null,
    null,
    v_reform_data,
    p_quantity,
    v_base_unit,
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
