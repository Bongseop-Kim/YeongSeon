-- IDOR 방지: replace_cart_items는 SECURITY DEFINER이므로 p_user_id와 auth.uid() 일치 검증 필수
CREATE OR REPLACE FUNCTION public.replace_cart_items(p_user_id uuid, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  item_record jsonb;
  coupon_id_text text;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized: cart can only be modified for the current user';
  end if;

  delete from cart_items where user_id = p_user_id;

  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for item_record in select * from jsonb_array_elements(p_items)
    loop
      coupon_id_text := coalesce(
        item_record->'appliedCoupon'->>'id',
        item_record->>'appliedCouponId'
      );

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
        (item_record->>'quantity')::integer,
        case
          when coupon_id_text is null or coupon_id_text = '' then null
          else coupon_id_text::uuid
        end
      );
    end loop;
  end if;
end;
$function$;
