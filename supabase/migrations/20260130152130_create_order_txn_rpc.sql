create or replace function public.create_order_txn(
  p_shipping_address_id uuid,
  p_items jsonb,
  p_original_price integer,
  p_total_discount integer,
  p_total_price integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  item_record jsonb;
  item_type text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items are required';
  end if;

  if not exists (
    select 1
    from shipping_addresses
    where id = p_shipping_address_id
      and user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  v_order_number := generate_order_number();

  insert into orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    status
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    p_total_price,
    p_original_price,
    p_total_discount,
    '대기중'
  )
  returning id into v_order_id;

  for item_record in select * from jsonb_array_elements(p_items)
  loop
    item_type := item_record->>'item_type';
    if item_type not in ('product', 'reform') then
      raise exception 'Invalid item type';
    end if;

    insert into order_items (
      order_id,
      item_id,
      item_type,
      product_id,
      selected_option_id,
      reform_data,
      quantity,
      unit_price,
      discount_amount,
      applied_user_coupon_id
    )
    values (
      v_order_id,
      item_record->>'item_id',
      item_type,
      nullif(item_record->>'product_id', '')::integer,
      nullif(item_record->>'selected_option_id', ''),
      case
        when item_record->'reform_data' is null or item_record->'reform_data' = 'null'::jsonb then null
        else item_record->'reform_data'
      end,
      (item_record->>'quantity')::integer,
      (item_record->>'unit_price')::integer,
      (item_record->>'discount_amount')::integer,
      nullif(item_record->>'applied_user_coupon_id', '')::uuid
    );
  end loop;

  update user_coupons
  set status = 'used',
      used_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and status = 'active'
    and id in (
      select distinct applied_user_coupon_id
      from order_items
      where order_id = v_order_id
        and applied_user_coupon_id is not null
    );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number
  );
end;
$function$;

grant execute on function public.create_order_txn(
  uuid,
  jsonb,
  integer,
  integer,
  integer
) to authenticated;
