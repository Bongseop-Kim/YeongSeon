create or replace function public.replace_cart_items(p_user_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  item_record jsonb;
  coupon_id_text text;
  quantity_text text;
  quantity_value integer;
begin
  if auth.uid() is null or p_user_id is null then
    raise exception 'unauthorized: authentication required';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized: cart can only be modified for the current user';
  end if;

  delete from cart_items where user_id = p_user_id;

  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid p_items: expected a JSON array';
  end if;

  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for item_record in select * from jsonb_array_elements(p_items)
    loop
      coupon_id_text := coalesce(
        item_record->'appliedCoupon'->>'id',
        item_record->>'appliedCouponId'
      );

      quantity_text := item_record->>'quantity';
      if quantity_text is null or quantity_text !~ '^[0-9]+$' then
        raise exception 'invalid quantity: %', coalesce(quantity_text, 'null');
      end if;

      quantity_value := quantity_text::integer;
      if quantity_value <= 0 then
        raise exception 'invalid quantity (must be > 0): %', quantity_text;
      end if;

      insert into cart_items (
        user_id,
        item_id,
        item_type,
        product_id,
        selected_option_id,
        reform_data,
        quantity,
        applied_user_coupon_id
      )
      values (
        p_user_id,
        item_record->>'id',
        (item_record->>'type')::text,
        case
          when item_record->'product' is null then null
          when item_record->'product'->>'id' is null or item_record->'product'->>'id' = 'null' then null
          else (item_record->'product'->>'id')::integer
        end,
        case
          when item_record->'selectedOption' is null then null
          when item_record->'selectedOption'->>'id' is null or item_record->'selectedOption'->>'id' = '' then null
          else item_record->'selectedOption'->>'id'
        end,
        case
          when item_record->'reformData' is null or item_record->'reformData' = 'null'::jsonb then null
          else item_record->'reformData'
        end,
        quantity_value,
        case
          when coupon_id_text is null or coupon_id_text = '' then null
          else coupon_id_text::uuid
        end
      );
    end loop;
  end if;
end;
$function$;
