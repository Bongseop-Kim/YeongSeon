-- =============================================================
-- 99_functions_sample.sql  – Sample order RPC functions
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_sample_order_txn(
  p_shipping_address_id uuid,
  p_sample_type text,
  p_options jsonb,
  p_reference_images jsonb DEFAULT '[]'::jsonb,
  p_additional_notes text DEFAULT ''
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

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  v_design_type := p_options->>'design_type';

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
    payment_group_id,
    sample_cost
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
    'sample',
    '대기중',
    v_payment_group_id,
    0
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
    0,
    0,
    null
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

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;
