revoke update on table "public"."claims" from "authenticated";

revoke update on table "public"."inquiries" from "authenticated";

revoke update on table "public"."orders" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke update on table "public"."quote_requests" from "authenticated";

drop function if exists "public"."create_custom_order_txn"(p_shipping_address_id uuid, p_options jsonb, p_quantity integer, p_reference_image_urls text[], p_additional_notes text, p_sample boolean);

drop function if exists "public"."upsert_shipping_address"(p_recipient_name character varying, p_recipient_phone character varying, p_address text, p_postal_code character varying, p_id uuid, p_address_detail character varying, p_delivery_request text, p_delivery_memo text, p_is_default boolean);

drop view if exists "public"."admin_claim_list_view";

drop view if exists "public"."admin_claim_status_log_view";

drop view if exists "public"."admin_order_detail_view";

drop view if exists "public"."admin_order_list_view";

drop view if exists "public"."admin_order_status_log_view";

drop view if exists "public"."claim_list_view";

drop view if exists "public"."order_detail_view";

drop view if exists "public"."order_item_view";

drop view if exists "public"."order_list_view";

drop view if exists "public"."product_list_view";

set check_function_bodies = off;

create or replace view "public"."admin_claim_list_view" as  SELECT cl.id,
    cl.user_id AS "userId",
    cl.claim_number AS "claimNumber",
    to_char(cl.created_at, 'YYYY-MM-DD'::text) AS date,
    cl.status,
    cl.type,
    cl.reason,
    cl.description,
    cl.quantity AS "claimQuantity",
    cl.created_at,
    cl.updated_at,
    cl.return_courier_company AS "returnCourierCompany",
    cl.return_tracking_number AS "returnTrackingNumber",
    cl.resend_courier_company AS "resendCourierCompany",
    cl.resend_tracking_number AS "resendTrackingNumber",
    o.id AS "orderId",
    o.order_number AS "orderNumber",
    o.status AS "orderStatus",
    o.courier_company AS "orderCourierCompany",
    o.tracking_number AS "orderTrackingNumber",
    o.shipped_at AS "orderShippedAt",
    p.name AS "customerName",
    p.phone AS "customerPhone",
    oi.item_type AS "itemType",
    pr.name AS "productName"
   FROM ((((public.claims cl
     JOIN public.orders o ON ((o.id = cl.order_id)))
     JOIN public.order_items oi ON ((oi.id = cl.order_item_id)))
     LEFT JOIN public.products pr ON ((pr.id = oi.product_id)))
     LEFT JOIN public.profiles p ON ((p.id = cl.user_id)));


create or replace view "public"."admin_claim_status_log_view" as  SELECT l.id,
    l.claim_id AS "claimId",
    l.changed_by AS "changedBy",
    l.previous_status AS "previousStatus",
    l.new_status AS "newStatus",
    l.memo,
    l.is_rollback AS "isRollback",
    l.created_at AS "createdAt"
   FROM public.claim_status_logs l;


create or replace view "public"."admin_order_detail_view" as  SELECT o.id,
    o.user_id AS "userId",
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.order_type AS "orderType",
    o.status,
    o.total_price AS "totalPrice",
    o.original_price AS "originalPrice",
    o.total_discount AS "totalDiscount",
    o.courier_company AS "courierCompany",
    o.tracking_number AS "trackingNumber",
    o.shipped_at AS "shippedAt",
    o.delivered_at AS "deliveredAt",
    o.confirmed_at AS "confirmedAt",
    o.created_at,
    o.updated_at,
    p.name AS "customerName",
    p.phone AS "customerPhone",
    public.admin_get_email(o.user_id) AS "customerEmail",
    sa.recipient_name AS "recipientName",
    sa.recipient_phone AS "recipientPhone",
    sa.address AS "shippingAddress",
    sa.address_detail AS "shippingAddressDetail",
    sa.postal_code AS "shippingPostalCode",
    sa.delivery_memo AS "deliveryMemo",
    sa.delivery_request AS "deliveryRequest",
    o.payment_group_id AS "paymentGroupId",
    o.shipping_cost AS "shippingCost"
   FROM ((public.orders o
     LEFT JOIN public.profiles p ON ((p.id = o.user_id)))
     LEFT JOIN public.shipping_addresses sa ON ((sa.id = o.shipping_address_id)));


create or replace view "public"."admin_order_list_view" as  SELECT o.id,
    o.user_id AS "userId",
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.order_type AS "orderType",
    o.status,
    o.total_price AS "totalPrice",
    o.original_price AS "originalPrice",
    o.total_discount AS "totalDiscount",
    o.courier_company AS "courierCompany",
    o.tracking_number AS "trackingNumber",
    o.shipped_at AS "shippedAt",
    o.delivered_at AS "deliveredAt",
    o.confirmed_at AS "confirmedAt",
    o.created_at,
    o.updated_at,
    p.name AS "customerName",
    p.phone AS "customerPhone",
    public.admin_get_email(o.user_id) AS "customerEmail",
        CASE
            WHEN (o.order_type = 'custom'::text) THEN ((ri.reform_data -> 'options'::text) ->> 'fabric_type'::text)
            ELSE NULL::text
        END AS "fabricType",
        CASE
            WHEN (o.order_type = 'custom'::text) THEN ((ri.reform_data -> 'options'::text) ->> 'design_type'::text)
            ELSE NULL::text
        END AS "designType",
        CASE
            WHEN (o.order_type = ANY (ARRAY['custom'::text, 'repair'::text])) THEN ri.item_quantity
            ELSE NULL::integer
        END AS "itemQuantity",
        CASE
            WHEN (o.order_type = 'repair'::text) THEN (ri.item_quantity || '개 넥타이 수선'::text)
            ELSE NULL::text
        END AS "reformSummary"
   FROM ((public.orders o
     LEFT JOIN public.profiles p ON ((p.id = o.user_id)))
     LEFT JOIN LATERAL ( SELECT oi.reform_data,
            oi.quantity AS item_quantity
           FROM public.order_items oi
          WHERE ((oi.order_id = o.id) AND (oi.item_type = 'reform'::text))
         LIMIT 1) ri ON ((o.order_type = ANY (ARRAY['custom'::text, 'repair'::text]))));


create or replace view "public"."admin_order_status_log_view" as  SELECT l.id,
    l.order_id AS "orderId",
    l.changed_by AS "changedBy",
    l.previous_status AS "previousStatus",
    l.new_status AS "newStatus",
    l.memo,
    l.is_rollback AS "isRollback",
    l.created_at AS "createdAt"
   FROM public.order_status_logs l;


CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid, p_new_status text, p_memo text DEFAULT NULL::text, p_is_rollback boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id       uuid;
  v_current_status text;
  v_order_type     text;
  v_total_price    integer;
  v_user_id        uuid;
  v_points_earned  integer;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status, order type, price, user
  select o.status, o.order_type, o.total_price, o.user_id
  into v_current_status, v_order_type, v_total_price, v_user_id
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if p_is_rollback then
    -- Rollback requires memo
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
    end if;

    -- Validate rollback transition by order_type
    -- 배송완료, 완료, 취소 상태는 is_rollback 여부와 무관하게 롤백 불가
    if v_order_type = 'sale' then
      if not (v_current_status = '진행중' and p_new_status = '대기중') then
        raise exception 'Invalid rollback from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
        or (v_current_status = '제작완료' and p_new_status = '제작중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '수선중' and p_new_status = '접수')
        or (v_current_status = '수선완료' and p_new_status = '수선중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  else
    -- Validate forward state transition by order_type
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '진행중')
        or (v_current_status = '진행중'   and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '진행중', '배송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'     and p_new_status = '제작중')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'     and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  end if;

  -- Apply the status update with any timestamp side-effects
  if p_new_status = '배송중' then
    update public.orders
    set status = p_new_status,
        shipped_at = coalesce(shipped_at, now())
    where id = p_order_id;

  elsif p_new_status = '배송완료' then
    update public.orders
    set status = p_new_status,
        delivered_at = now()
    where id = p_order_id;

  elsif p_new_status = '완료' then
    -- Admin manually confirms purchase: 2% points
    v_points_earned := floor(v_total_price * 0.02);

    update public.orders
    set status       = p_new_status,
        confirmed_at = now()
    where id = p_order_id;

    if v_points_earned > 0 then
      insert into public.points (user_id, order_id, amount, type, description)
      values (
        v_user_id,
        p_order_id,
        v_points_earned,
        'earn',
        '구매확정 포인트 적립 (관리자 처리, 2%)'
      );
    end if;

  else
    update public.orders
    set status = p_new_status
    where id = p_order_id;
  end if;

  -- Insert status log
  insert into public.order_status_logs (
    order_id,
    changed_by,
    previous_status,
    new_status,
    memo,
    is_rollback
  )
  values (
    p_order_id,
    v_admin_id,
    v_current_status,
    p_new_status,
    p_memo,
    p_is_rollback
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_generate_product_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prefix text;
  v_date_str text;
  v_seq integer;
begin
  if NEW.code IS NOT NULL AND NEW.code <> '' then
    return NEW;
  end if;

  v_prefix := case NEW.category
    when '3fold' then '3F'
    when 'sfolderato' then 'SF'
    when 'knit' then 'KN'
    when 'bowtie' then 'BT'
    else 'XX'
  end;

  v_date_str := to_char(now(), 'YYYYMMDD');

  perform pg_advisory_xact_lock(hashtext('PROD' || v_prefix || v_date_str));

  select coalesce(
    max(cast(substring(code from length(v_prefix || '-' || v_date_str || '-') + 1) as integer)),
    0
  ) + 1
  into v_seq
  from products
  where code like v_prefix || '-' || v_date_str || '-%'
    and substring(code from length(v_prefix || '-' || v_date_str || '-') + 1) ~ '^\d+$';

  if v_seq > 999 then
    raise exception 'Product code sequence overflow: % codes already exist for prefix % on %',
      v_seq - 1, v_prefix, v_date_str;
  end if;

  NEW.code := v_prefix || '-' || v_date_str || '-' || lpad(v_seq::text, 3, '0');
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_order_txn(p_shipping_address_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_normalized_items jsonb := '[]'::jsonb;

  v_item_id text;
  v_item_type text;
  v_product_id integer;
  v_selected_option_id text;
  v_reform_data jsonb;
  v_quantity integer;
  v_applied_coupon_id uuid;
  v_unit_price integer;
  v_discount_amount integer;
  v_capped_line_discount integer;
  v_discount_remainder integer;
  v_option_additional_price integer;
  v_line_discount_total integer;
  v_product_stock integer;
  v_option_stock integer;

  v_original_price integer := 0;
  v_total_discount integer := 0;
  v_total_price integer := 0;
  v_reform_base_cost integer;
  v_reform_shipping_cost integer;
  v_used_coupon_ids uuid[] := '{}'::uuid[];
  v_coupon record;
  v_order_type text;

  v_payment_group_id uuid;
  v_group_total_amount integer := 0;
  v_orders_result jsonb := '[]'::jsonb;
  v_product_items jsonb := '[]'::jsonb;
  v_reform_items jsonb := '[]'::jsonb;
  v_product_original integer := 0;
  v_product_discount integer := 0;
  v_reform_original integer := 0;
  v_reform_discount integer := 0;
  v_shipping_cost integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
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

  SELECT amount INTO v_reform_base_cost
  FROM custom_order_pricing_constants WHERE key = 'REFORM_BASE_COST';

  SELECT amount INTO v_reform_shipping_cost
  FROM custom_order_pricing_constants WHERE key = 'REFORM_SHIPPING_COST';

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := nullif(v_item->>'item_id', '');
    v_item_type := v_item->>'item_type';
    v_quantity := nullif(v_item->>'quantity', '')::integer;
    v_applied_coupon_id := nullif(v_item->>'applied_user_coupon_id', '')::uuid;
    v_discount_amount := 0;
    v_option_additional_price := 0;
    v_line_discount_total := 0;

    if v_item_id is null then
      raise exception 'Invalid item id';
    end if;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    if v_item_type = 'product' then
      v_product_id := nullif(v_item->>'product_id', '')::integer;
      v_selected_option_id := nullif(v_item->>'selected_option_id', '');
      v_reform_data := null;

      if v_product_id is null then
        raise exception 'Product id is required';
      end if;

      select p.price, p.stock
      into v_unit_price, v_product_stock
      from products p
      where p.id = v_product_id
      for update;

      if not found then
        raise exception 'Product not found';
      end if;

      if v_selected_option_id is not null then
        select coalesce(po.additional_price, 0), po.stock
        into v_option_additional_price, v_option_stock
        from product_options po
        where po.product_id = v_product_id
          and po.option_id = v_selected_option_id
        for update;

        if not found then
          raise exception 'Selected option not found';
        end if;

        -- Check option stock
        if v_option_stock is not null then
          if v_option_stock < v_quantity then
            raise exception 'Insufficient stock for option';
          end if;
          update product_options
          set stock = stock - v_quantity
          where product_id = v_product_id
            and option_id = v_selected_option_id;
        end if;
      else
        -- No option selected: check product-level stock
        if v_product_stock is not null then
          if v_product_stock < v_quantity then
            raise exception 'Insufficient stock';
          end if;
          update products
          set stock = stock - v_quantity
          where id = v_product_id;
        end if;
      end if;

      v_unit_price := v_unit_price + v_option_additional_price;
    elsif v_item_type = 'reform' then
      v_product_id := null;
      v_selected_option_id := null;
      v_reform_data := v_item->'reform_data';

      if v_reform_data is null or v_reform_data = 'null'::jsonb then
        raise exception 'Reform data is required';
      end if;

      v_unit_price := v_reform_base_cost;
      v_reform_data := jsonb_set(
        v_reform_data,
        '{cost}',
        to_jsonb(v_reform_base_cost),
        true
      );
    else
      raise exception 'Invalid item type';
    end if;

    if v_applied_coupon_id is not null then
      if v_applied_coupon_id = any(v_used_coupon_ids) then
        raise exception 'Coupon can only be applied once per order';
      end if;

      select
        uc.id,
        uc.status,
        uc.expires_at,
        c.discount_type,
        c.discount_value,
        c.max_discount_amount,
        c.expiry_date,
        c.is_active
      into v_coupon
      from user_coupons uc
      join coupons c on c.id = uc.coupon_id
      where uc.id = v_applied_coupon_id
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
        v_discount_amount :=
          floor(v_unit_price * (v_coupon.discount_value::numeric / 100.0))::integer;
      elsif v_coupon.discount_type = 'fixed' then
        v_discount_amount := floor(v_coupon.discount_value::numeric)::integer;
      else
        raise exception 'Invalid coupon type';
      end if;

      v_discount_amount := greatest(0, least(v_discount_amount, v_unit_price));

      v_capped_line_discount := v_discount_amount * v_quantity;
      if v_coupon.max_discount_amount is not null then
        v_capped_line_discount := least(v_capped_line_discount, v_coupon.max_discount_amount);
      end if;

      v_discount_amount := floor(v_capped_line_discount::numeric / v_quantity)::integer;
      v_discount_remainder := v_capped_line_discount % v_quantity;
      -- Distribute +1 to the first v_discount_remainder units.
      v_line_discount_total := (v_discount_amount * v_quantity) + v_discount_remainder;
      v_used_coupon_ids := array_append(v_used_coupon_ids, v_applied_coupon_id);
    end if;

    v_original_price := v_original_price + (v_unit_price * v_quantity);
    if v_applied_coupon_id is not null then
      v_total_discount := v_total_discount + v_line_discount_total;
    end if;

    v_normalized_items := v_normalized_items || jsonb_build_array(
      jsonb_build_object(
        'item_id', v_item_id,
        'item_type', v_item_type,
        'product_id', v_product_id,
        'selected_option_id', v_selected_option_id,
        'reform_data', v_reform_data,
        'quantity', v_quantity,
        'unit_price', v_unit_price,
        'discount_amount', v_discount_amount,
        'line_discount_amount', v_line_discount_total,
        'applied_user_coupon_id', v_applied_coupon_id
      )
    );
  end loop;

  -- 아이템 타입별 분류 및 소계 계산
  v_payment_group_id := gen_random_uuid();

  for v_item in select * from jsonb_array_elements(v_normalized_items)
  loop
    if v_item->>'item_type' = 'product' then
      v_product_items := v_product_items || jsonb_build_array(v_item);
      v_product_original := v_product_original
        + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
      v_product_discount := v_product_discount
        + coalesce((v_item->>'line_discount_amount')::integer, 0);
    elsif v_item->>'item_type' = 'reform' then
      v_reform_items := v_reform_items || jsonb_build_array(v_item);
      v_reform_original := v_reform_original
        + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
      v_reform_discount := v_reform_discount
        + coalesce((v_item->>'line_discount_amount')::integer, 0);
    end if;
  end loop;

  -- product 주문 생성 (shipping_cost=0)
  if jsonb_array_length(v_product_items) > 0 then
    v_order_number := generate_order_number();
    v_total_price := v_product_original - v_product_discount;

    insert into orders (
      user_id, order_number, shipping_address_id,
      total_price, original_price, total_discount,
      order_type, status, payment_group_id, shipping_cost
    )
    values (
      v_user_id, v_order_number, p_shipping_address_id,
      v_total_price, v_product_original, v_product_discount,
      'sale', '대기중', v_payment_group_id, 0
    )
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(v_product_items)
    loop
      insert into order_items (
        order_id, item_id, item_type, product_id,
        selected_option_id, reform_data, quantity,
        unit_price, discount_amount, line_discount_amount,
        applied_user_coupon_id
      )
      values (
        v_order_id,
        v_item->>'item_id',
        v_item->>'item_type',
        nullif(v_item->>'product_id', '')::integer,
        nullif(v_item->>'selected_option_id', ''),
        case
          when v_item->'reform_data' is null or v_item->'reform_data' = 'null'::jsonb
            then null
          else v_item->'reform_data'
        end,
        (v_item->>'quantity')::integer,
        (v_item->>'unit_price')::integer,
        (v_item->>'discount_amount')::integer,
        coalesce((v_item->>'line_discount_amount')::integer, 0),
        nullif(v_item->>'applied_user_coupon_id', '')::uuid
      );
    end loop;

    v_group_total_amount := v_group_total_amount + v_total_price;
    v_orders_result := v_orders_result || jsonb_build_array(
      jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_type', 'sale'
      )
    );
  end if;

  -- repair 주문 생성 (shipping_cost=v_reform_shipping_cost)
  if jsonb_array_length(v_reform_items) > 0 then
    v_order_number := generate_order_number();
    v_shipping_cost := coalesce(v_reform_shipping_cost, 0);
    v_total_price := v_reform_original - v_reform_discount + v_shipping_cost;

    insert into orders (
      user_id, order_number, shipping_address_id,
      total_price, original_price, total_discount,
      order_type, status, payment_group_id, shipping_cost
    )
    values (
      v_user_id, v_order_number, p_shipping_address_id,
      v_total_price, v_reform_original, v_reform_discount,
      'repair', '대기중', v_payment_group_id, v_shipping_cost
    )
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(v_reform_items)
    loop
      insert into order_items (
        order_id, item_id, item_type, product_id,
        selected_option_id, reform_data, quantity,
        unit_price, discount_amount, line_discount_amount,
        applied_user_coupon_id
      )
      values (
        v_order_id,
        v_item->>'item_id',
        v_item->>'item_type',
        nullif(v_item->>'product_id', '')::integer,
        nullif(v_item->>'selected_option_id', ''),
        case
          when v_item->'reform_data' is null or v_item->'reform_data' = 'null'::jsonb
            then null
          else v_item->'reform_data'
        end,
        (v_item->>'quantity')::integer,
        (v_item->>'unit_price')::integer,
        (v_item->>'discount_amount')::integer,
        coalesce((v_item->>'line_discount_amount')::integer, 0),
        nullif(v_item->>'applied_user_coupon_id', '')::uuid
      );
    end loop;

    v_group_total_amount := v_group_total_amount + v_total_price;
    v_orders_result := v_orders_result || jsonb_build_array(
      jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_type', 'repair'
      )
    );
  end if;

  if array_length(v_used_coupon_ids, 1) is not null then
    update user_coupons
    set status = 'used',
        used_at = now(),
        updated_at = now()
    where user_id = v_user_id
      and status = 'active'
      and id = any(v_used_coupon_ids);
  end if;

  return jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'total_amount', v_group_total_amount,
    'orders', v_orders_result
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_quote_request_txn(p_shipping_address_id uuid, p_options jsonb, p_quantity integer, p_reference_image_urls text[] DEFAULT '{}'::text[], p_additional_notes text DEFAULT ''::text, p_contact_name text DEFAULT ''::text, p_contact_title text DEFAULT ''::text, p_contact_method text DEFAULT 'phone'::text, p_contact_value text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_quote_id uuid;
  v_quote_number text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Quantity validation
  if p_quantity is null or p_quantity < 100 then
    raise exception 'Quantity must be 100 or more';
  end if;

  -- Shipping address validation
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

  -- Contact field validation
  if p_contact_name is null or trim(p_contact_name) = '' then
    raise exception 'Contact name is required';
  end if;

  if p_contact_method is null or p_contact_method not in ('email', 'kakao', 'phone') then
    raise exception 'Invalid contact method';
  end if;

  if p_contact_value is null or trim(p_contact_value) = '' then
    raise exception 'Contact value is required';
  end if;

  -- Options validation
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  v_quote_number := public.generate_quote_number();

  insert into public.quote_requests (
    user_id,
    quote_number,
    shipping_address_id,
    options,
    quantity,
    reference_image_urls,
    additional_notes,
    contact_name,
    contact_title,
    contact_method,
    contact_value,
    status
  )
  values (
    v_user_id,
    v_quote_number,
    p_shipping_address_id,
    p_options,
    p_quantity,
    coalesce(p_reference_image_urls, '{}'::text[]),
    coalesce(p_additional_notes, ''),
    trim(p_contact_name),
    coalesce(trim(p_contact_title), ''),
    p_contact_method,
    trim(p_contact_value),
    '요청'
  )
  returning id into v_quote_id;

  return jsonb_build_object(
    'quote_request_id', v_quote_id,
    'quote_number', v_quote_number
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.customer_confirm_purchase(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id        uuid;
  v_current_status text;
  v_total_price    integer;
  v_points_earned  integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock the row and verify ownership + status
  select o.status, o.total_price
  into v_current_status, v_total_price
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found or access denied';
  end if;

  if v_current_status <> '배송완료' then
    raise exception '구매확정은 배송완료 상태에서만 가능합니다 (현재: %)', v_current_status;
  end if;

  -- Earn 2% points for manual confirmation
  v_points_earned := floor(v_total_price * 0.02);

  update public.orders
  set status       = '완료',
      confirmed_at = now()
  where id = p_order_id;

  if v_points_earned > 0 then
    insert into public.points (user_id, order_id, amount, type, description)
    values (
      v_user_id,
      p_order_id,
      v_points_earned,
      'earn',
      '구매확정 포인트 적립 (직접 확정, 2%)'
    );
  end if;

  -- Audit log (changed_by = customer uid)
  insert into public.order_status_logs (
    order_id,
    changed_by,
    previous_status,
    new_status,
    memo
  )
  values (
    p_order_id,
    v_user_id,
    '배송완료',
    '완료',
    '고객 직접 구매확정'
  );

  return jsonb_build_object(
    'success', true,
    'points_earned', v_points_earned
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  quote_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Serialize same-day quote number allocation to prevent duplicates.
  -- Uses 'QUO' prefix in hashtext to avoid collision with other generators.
  perform pg_advisory_xact_lock(hashtext('QUO' || date_str));

  select coalesce(max(cast(substring(quote_number from 14) as integer)), 0) + 1
  into seq_num
  from quote_requests
  where quote_number like 'QUO-' || date_str || '-%';

  quote_num := 'QUO-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return quote_num;
end;
$function$
;

create or replace view "public"."order_detail_view" as  SELECT o.id,
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.status,
    o.total_price AS "totalPrice",
    o.courier_company AS "courierCompany",
    o.tracking_number AS "trackingNumber",
    o.shipped_at AS "shippedAt",
    o.delivered_at AS "deliveredAt",
    o.confirmed_at AS "confirmedAt",
    o.created_at,
    sa.recipient_name AS "recipientName",
    sa.recipient_phone AS "recipientPhone",
    sa.address AS "shippingAddress",
    sa.address_detail AS "shippingAddressDetail",
    sa.postal_code AS "shippingPostalCode",
    sa.delivery_memo AS "deliveryMemo",
    sa.delivery_request AS "deliveryRequest"
   FROM (public.orders o
     LEFT JOIN public.shipping_addresses sa ON ((sa.id = o.shipping_address_id)))
  WHERE (o.user_id = auth.uid());


create or replace view "public"."order_list_view" as  SELECT o.id,
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.status,
    o.total_price AS "totalPrice",
    o.created_at
   FROM public.orders o
  WHERE (o.user_id = auth.uid());


create or replace view "public"."product_list_view" as  SELECT p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images AS "detailImages",
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.stock,
    p.created_at,
    p.updated_at,
    COALESCE(jsonb_agg(jsonb_build_object('id', po.option_id, 'name', po.name, 'additionalPrice', po.additional_price, 'stock', po.stock) ORDER BY po.option_id) FILTER (WHERE (po.id IS NOT NULL)), '[]'::jsonb) AS options,
    COALESCE(lc.likes, 0) AS likes,
    COALESCE(public.product_is_liked_rpc(p.id), false) AS "isLiked"
   FROM ((public.products p
     LEFT JOIN public.product_options po ON ((po.product_id = p.id)))
     LEFT JOIN public.product_like_counts_rpc() lc(product_id, likes) ON ((lc.product_id = p.id)))
  GROUP BY p.id, p.code, p.name, p.price, p.image, p.detail_images, p.category, p.color, p.pattern, p.material, p.info, p.stock, p.created_at, p.updated_at, lc.likes;


create or replace view "public"."claim_list_view" as  SELECT cl.id,
    cl.claim_number AS "claimNumber",
    to_char(cl.created_at, 'YYYY-MM-DD'::text) AS date,
    cl.status,
    cl.type,
    cl.reason,
    cl.description,
    cl.quantity AS "claimQuantity",
    o.id AS "orderId",
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS "orderDate",
    jsonb_build_object('id', oi.item_id, 'type', oi.item_type, 'product',
        CASE
            WHEN (oi.item_type = 'product'::text) THEN to_jsonb(p.*)
            ELSE NULL::jsonb
        END, 'selectedOption',
        CASE
            WHEN ((oi.item_type = 'product'::text) AND (oi.selected_option_id IS NOT NULL)) THEN ( SELECT option.value AS option
               FROM jsonb_array_elements(COALESCE((to_jsonb(p.*) -> 'options'::text), '[]'::jsonb)) option(value)
              WHERE ((option.value ->> 'id'::text) = oi.selected_option_id)
             LIMIT 1)
            ELSE NULL::jsonb
        END, 'quantity', oi.quantity, 'reformData',
        CASE
            WHEN (oi.item_type = 'reform'::text) THEN oi.reform_data
            ELSE NULL::jsonb
        END, 'appliedCoupon', uc.user_coupon) AS item
   FROM ((((public.claims cl
     JOIN public.orders o ON (((o.id = cl.order_id) AND (o.user_id = auth.uid()))))
     JOIN public.order_items oi ON ((oi.id = cl.order_item_id)))
     LEFT JOIN LATERAL ( SELECT plv.id,
            plv.code,
            plv.name,
            plv.price,
            plv.image,
            plv."detailImages",
            plv.category,
            plv.color,
            plv.pattern,
            plv.material,
            plv.info,
            plv.created_at,
            plv.updated_at,
            plv.options,
            plv.likes,
            plv."isLiked"
           FROM public.product_list_view plv
          WHERE ((oi.item_type = 'product'::text) AND (oi.product_id IS NOT NULL) AND (plv.id = oi.product_id))
         LIMIT 1) p ON (true))
     LEFT JOIN LATERAL ( SELECT uc1.id,
            jsonb_build_object('id', uc1.id, 'userId', uc1.user_id, 'couponId', uc1.coupon_id, 'status', uc1.status, 'issuedAt', uc1.issued_at, 'expiresAt', uc1.expires_at, 'usedAt', uc1.used_at, 'coupon', jsonb_build_object('id', cp.id, 'name', cp.name, 'discountType', cp.discount_type, 'discountValue', cp.discount_value, 'maxDiscountAmount', cp.max_discount_amount, 'description', cp.description, 'expiryDate', cp.expiry_date, 'additionalInfo', cp.additional_info)) AS user_coupon
           FROM (public.user_coupons uc1
             JOIN public.coupons cp ON ((cp.id = uc1.coupon_id)))
          WHERE (uc1.id = oi.applied_user_coupon_id)
         LIMIT 1) uc ON (true))
  WHERE (cl.user_id = auth.uid());


create or replace view "public"."order_item_view" as  SELECT oi.order_id,
    oi.created_at,
    oi.item_id AS id,
    oi.item_type AS type,
        CASE
            WHEN (oi.item_type = 'product'::text) THEN to_jsonb(p.*)
            ELSE NULL::jsonb
        END AS product,
        CASE
            WHEN ((oi.item_type = 'product'::text) AND (oi.selected_option_id IS NOT NULL)) THEN ( SELECT option.value AS option
               FROM jsonb_array_elements(COALESCE((to_jsonb(p.*) -> 'options'::text), '[]'::jsonb)) option(value)
              WHERE ((option.value ->> 'id'::text) = oi.selected_option_id)
             LIMIT 1)
            ELSE NULL::jsonb
        END AS "selectedOption",
    oi.quantity,
        CASE
            WHEN (oi.item_type = 'reform'::text) THEN oi.reform_data
            ELSE NULL::jsonb
        END AS "reformData",
    uc.user_coupon AS "appliedCoupon"
   FROM (((public.order_items oi
     JOIN public.orders o ON (((o.id = oi.order_id) AND (o.user_id = auth.uid()))))
     LEFT JOIN LATERAL ( SELECT plv.id,
            plv.code,
            plv.name,
            plv.price,
            plv.image,
            plv."detailImages",
            plv.category,
            plv.color,
            plv.pattern,
            plv.material,
            plv.info,
            plv.created_at,
            plv.updated_at,
            plv.options,
            plv.likes,
            plv."isLiked"
           FROM public.product_list_view plv
          WHERE ((oi.item_type = 'product'::text) AND (oi.product_id IS NOT NULL) AND (plv.id = oi.product_id))
         LIMIT 1) p ON (true))
     LEFT JOIN LATERAL ( SELECT uc1.id,
            jsonb_build_object('id', uc1.id, 'userId', uc1.user_id, 'couponId', uc1.coupon_id, 'status', uc1.status, 'issuedAt', uc1.issued_at, 'expiresAt', uc1.expires_at, 'usedAt', uc1.used_at, 'coupon', jsonb_build_object('id', c.id, 'name', c.name, 'discountType', c.discount_type, 'discountValue', c.discount_value, 'maxDiscountAmount', c.max_discount_amount, 'description', c.description, 'expiryDate', c.expiry_date, 'additionalInfo', c.additional_info)) AS user_coupon
           FROM (public.user_coupons uc1
             JOIN public.coupons c ON ((c.id = uc1.coupon_id)))
          WHERE (uc1.id = oi.applied_user_coupon_id)
         LIMIT 1) uc ON (true));



