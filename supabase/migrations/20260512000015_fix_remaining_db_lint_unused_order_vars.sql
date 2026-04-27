create or replace function public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_images jsonb default '[]'::jsonb,
  p_additional_notes text default '',
  p_sample boolean default null,
  p_sample_type text default null,
  p_user_coupon_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_payment_group_id uuid;
  v_sewing_cost integer;
  v_fabric_cost integer;
  v_total_cost integer;
  v_elem jsonb;
  v_idx integer;
  v_base_unit integer;
  v_remainder integer;
  v_coupon record;
  v_discount_amount integer := 0;
  v_capped_line_discount integer := 0;
  v_discount_remainder integer := 0;
  v_line_discount_total integer := 0;
  v_total_price integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_sample is not null or p_sample_type is not null then
    raise exception 'Legacy sample parameters (p_sample, p_sample_type) are no longer supported. Use create_sample_order_txn instead.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
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

  v_base_unit := floor(v_total_cost::numeric / p_quantity)::integer;
  v_remainder := v_total_cost - v_base_unit * p_quantity;

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

    if v_coupon.discount_type = 'percentage' then
      v_discount_amount := floor(v_base_unit * (v_coupon.discount_value::numeric / 100.0))::integer;
    elsif v_coupon.discount_type = 'fixed' then
      v_discount_amount := floor(v_coupon.discount_value::numeric)::integer;
    else
      raise exception 'Invalid coupon type';
    end if;

    v_discount_amount := greatest(0, least(v_discount_amount, v_base_unit));
    v_capped_line_discount := v_discount_amount * p_quantity;
    if v_coupon.max_discount_amount is not null then
      v_capped_line_discount := least(v_capped_line_discount, v_coupon.max_discount_amount);
    end if;

    v_discount_amount := floor(v_capped_line_discount::numeric / p_quantity)::integer;
    v_discount_remainder := v_capped_line_discount % p_quantity;
    v_line_discount_total := (v_discount_amount * p_quantity) + v_discount_remainder;
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
    'custom',
    '대기중',
    v_payment_group_id
  )
  returning id into v_order_id;

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
    'custom-order-' || v_order_id::text,
    'custom',
    null,
    null,
    jsonb_build_object(
      'custom_order', true,
      'quantity', p_quantity,
      'options', p_options,
      'reference_images', coalesce(p_reference_images, '[]'::jsonb),
      'additional_notes', coalesce(p_additional_notes, ''),
      'pricing', jsonb_build_object(
        'sewing_cost', v_sewing_cost,
        'fabric_cost', v_fabric_cost,
        'total_cost', v_total_cost,
        'unit_price_remainder', v_remainder
      )
    ),
    p_quantity,
    v_base_unit,
    v_discount_amount,
    v_line_discount_total,
    p_user_coupon_id
  );

  if p_reference_images is not null and jsonb_array_length(p_reference_images) > 0 then
    insert into public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    select
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/custom-orders',
      'custom_order',
      v_order_id::text,
      v_user_id
    from jsonb_array_elements(p_reference_images) as elem;
  end if;

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

comment on function public.create_custom_order_txn(uuid, jsonb, integer, jsonb, text, boolean, text, uuid)
  is 'SECURITY DEFINER is required so authenticated clients can create owned custom orders and order items while ownership is enforced with auth.uid() and shipping address validation.';

drop function if exists public.admin_update_order_status(uuid, text, text, text, boolean);

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text default null::text,
  p_is_rollback boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_admin_id uuid := auth.uid();
  v_current_status text;
  v_order_type text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select status, order_type
  into v_current_status, v_order_type
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  if exists (
    select 1
    from public.claims c
    where c.order_id = p_order_id
      and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception '활성 클레임이 있는 주문은 주문 상태를 직접 변경할 수 없습니다';
  end if;

  if p_new_status is null or btrim(p_new_status) = '' then
    raise exception 'p_new_status is required';
  end if;

  if p_is_rollback and (p_memo is null or btrim(p_memo) = '') then
    raise exception '롤백 시 사유 입력 필수';
  end if;

  if p_is_rollback then
    if v_current_status in ('배송중', '배송완료', '완료', '취소', '수거완료', '재발송') then
      raise exception 'Rollback not allowed from status: %', v_current_status;
    end if;

    if v_order_type = 'sale' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '진행중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
        or (v_current_status = '제작완료' and p_new_status = '제작중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '접수' and p_new_status = '발송중')
        or (v_current_status = '수선중' and p_new_status = '접수')
        or (v_current_status = '수선완료' and p_new_status = '수선중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  else
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '대기중' and p_new_status = '진행중')
        or (v_current_status = '진행중' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '대기중' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '제작중')
        or (v_current_status = '제작중' and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '접수' and p_new_status = '제작중')
        or (v_current_status = '제작중' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '발송중' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '수선중')
        or (v_current_status = '수선중' and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '발송대기', '발송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      if not (
        p_new_status = '취소' and v_current_status in ('대기중', '결제중')
      ) then
        raise exception 'Invalid transition from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  end if;

  update public.orders
  set status = p_new_status,
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_admin_id, v_current_status, p_new_status, p_memo
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;

comment on function public.admin_update_order_status(uuid, text, text, boolean)
  is 'SECURITY DEFINER is required so admins can update order status and write status logs while access is restricted by public.is_admin().';

grant execute on function public.admin_update_order_status(uuid, text, text, boolean) to authenticated, service_role;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text,
  p_payment_key text,
  p_is_rollback boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return public.admin_update_order_status(
    p_order_id,
    p_new_status,
    p_memo,
    p_is_rollback
  );
end;
$$;

comment on function public.admin_update_order_status(uuid, text, text, text, boolean)
  is 'SECURITY DEFINER is required for legacy positional callers that still pass the deprecated p_payment_key placeholder while admin access remains restricted by public.is_admin() in the canonical function. Deprecated: placeholder p_payment_key retained for legacy positional callers; scheduled for removal in the next major release.';

grant execute on function public.admin_update_order_status(uuid, text, text, text, boolean) to authenticated, service_role;
