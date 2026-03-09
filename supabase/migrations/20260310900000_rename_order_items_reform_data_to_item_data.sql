-- SECTION 1 — Rename column
ALTER TABLE public.order_items RENAME COLUMN reform_data TO item_data;

ALTER TABLE public.order_items
  DROP CONSTRAINT order_items_item_type_content_check,
  ADD CONSTRAINT order_items_item_type_content_check
    CHECK (
      (item_type = 'product' AND product_id IS NOT NULL)
      OR
      (item_type = 'reform' AND item_data IS NOT NULL)
      OR
      (item_type = 'custom' AND item_data IS NOT NULL)
    );

-- SECTION 2 — Re-create 4 views
CREATE OR REPLACE VIEW public.order_item_view
WITH (security_invoker = true)
AS
SELECT
  oi.order_id,
  oi.created_at,
  oi.item_id AS id,
  oi.item_type AS type,
  CASE
    WHEN oi.item_type = 'product' THEN to_jsonb(p)
    ELSE null
  END AS product,
  CASE
    WHEN oi.item_type = 'product' AND oi.selected_option_id IS NOT NULL THEN (
      SELECT option
      FROM jsonb_array_elements(coalesce(to_jsonb(p)->'options', '[]'::jsonb)) option
      WHERE option->>'id' = oi.selected_option_id
      LIMIT 1
    )
    ELSE null
  END AS "selectedOption",
  oi.quantity,
  CASE
    WHEN oi.item_type IN ('reform', 'custom') THEN oi.item_data
    ELSE null
  END AS "reformData",
  uc.user_coupon AS "appliedCoupon"
FROM public.order_items oi
JOIN public.orders o
  ON o.id = oi.order_id AND o.user_id = auth.uid()
LEFT JOIN LATERAL (
  SELECT
    plv.id, plv.code, plv.name, plv.price, plv.image,
    plv."detailImages", plv.category, plv.color, plv.pattern,
    plv.material, plv.info, plv.created_at, plv.updated_at,
    plv.options, plv.likes, plv."isLiked"
  FROM public.product_list_view plv
  WHERE oi.item_type = 'product'
    AND oi.product_id IS NOT NULL
    AND plv.id = oi.product_id
  LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT
    uc1.id,
    jsonb_build_object(
      'id', uc1.id,
      'userId', uc1.user_id,
      'couponId', uc1.coupon_id,
      'status', uc1.status,
      'issuedAt', uc1.issued_at,
      'expiresAt', uc1.expires_at,
      'usedAt', uc1.used_at,
      'coupon', jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'discountType', c.discount_type,
        'discountValue', c.discount_value,
        'maxDiscountAmount', c.max_discount_amount,
        'description', c.description,
        'expiryDate', c.expiry_date,
        'additionalInfo', c.additional_info
      )
    ) AS user_coupon
  FROM public.user_coupons uc1
  JOIN public.coupons c ON c.id = uc1.coupon_id
  WHERE uc1.id = oi.applied_user_coupon_id
  LIMIT 1
) uc ON true;

CREATE OR REPLACE VIEW public.claim_list_view
WITH (security_invoker = true)
AS
SELECT
  cl.id,
  cl.claim_number AS "claimNumber",
  to_char(cl.created_at, 'YYYY-MM-DD') AS date,
  cl.status,
  cl.type,
  cl.reason,
  cl.description,
  cl.quantity AS "claimQuantity",
  o.id AS "orderId",
  o.order_number AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS "orderDate",
  jsonb_build_object(
    'id', oi.item_id,
    'type', oi.item_type,
    'product', CASE
      WHEN oi.item_type = 'product' THEN to_jsonb(p)
      ELSE null
    END,
    'selectedOption', CASE
      WHEN oi.item_type = 'product' AND oi.selected_option_id IS NOT NULL THEN (
        SELECT option
        FROM jsonb_array_elements(coalesce(to_jsonb(p)->'options', '[]'::jsonb)) option
        WHERE option->>'id' = oi.selected_option_id
        LIMIT 1
      )
      ELSE null
    END,
    'quantity', oi.quantity,
    'reformData', CASE
      WHEN oi.item_type IN ('reform', 'custom') THEN oi.item_data
      ELSE null
    END,
    'appliedCoupon', uc.user_coupon
  ) AS item
FROM public.claims cl
JOIN public.orders o
  ON o.id = cl.order_id AND o.user_id = auth.uid()
JOIN public.order_items oi
  ON oi.id = cl.order_item_id
LEFT JOIN LATERAL (
  SELECT
    plv.id, plv.code, plv.name, plv.price, plv.image,
    plv."detailImages", plv.category, plv.color, plv.pattern,
    plv.material, plv.info, plv.created_at, plv.updated_at,
    plv.options, plv.likes, plv."isLiked"
  FROM public.product_list_view plv
  WHERE oi.item_type = 'product'
    AND oi.product_id IS NOT NULL
    AND plv.id = oi.product_id
  LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT
    uc1.id,
    jsonb_build_object(
      'id', uc1.id,
      'userId', uc1.user_id,
      'couponId', uc1.coupon_id,
      'status', uc1.status,
      'issuedAt', uc1.issued_at,
      'expiresAt', uc1.expires_at,
      'usedAt', uc1.used_at,
      'coupon', jsonb_build_object(
        'id', cp.id,
        'name', cp.name,
        'discountType', cp.discount_type,
        'discountValue', cp.discount_value,
        'maxDiscountAmount', cp.max_discount_amount,
        'description', cp.description,
        'expiryDate', cp.expiry_date,
        'additionalInfo', cp.additional_info
      )
    ) AS user_coupon
  FROM public.user_coupons uc1
  JOIN public.coupons cp ON cp.id = uc1.coupon_id
  WHERE uc1.id = oi.applied_user_coupon_id
  LIMIT 1
) uc ON true
WHERE cl.user_id = auth.uid();

CREATE OR REPLACE VIEW public.admin_order_list_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.user_id        AS "userId",
  o.order_number   AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.order_type     AS "orderType",
  o.status,
  o.total_price    AS "totalPrice",
  o.original_price AS "originalPrice",
  o.total_discount AS "totalDiscount",
  o.courier_company  AS "courierCompany",
  o.tracking_number  AS "trackingNumber",
  o.shipped_at       AS "shippedAt",
  o.delivered_at     AS "deliveredAt",
  o.confirmed_at     AS "confirmedAt",
  o.created_at,
  o.updated_at,
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  public.admin_get_email(o.user_id) AS "customerEmail",
  CASE WHEN o.order_type = 'custom' THEN ri.item_data->'options'->>'fabric_type' ELSE NULL END AS "fabricType",
  CASE WHEN o.order_type = 'custom' THEN ri.item_data->'options'->>'design_type' ELSE NULL END AS "designType",
  CASE WHEN o.order_type IN ('custom', 'repair') THEN ri.item_quantity ELSE NULL END AS "itemQuantity",
  CASE WHEN o.order_type = 'repair' THEN
    ri.item_quantity || '개 넥타이 수선'
  ELSE NULL END AS "reformSummary",
  o.payment_group_id AS "paymentGroupId",
  o.shipping_cost    AS "shippingCost"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN LATERAL (
  SELECT
    (
      SELECT oi2.item_data
      FROM public.order_items oi2
      WHERE oi2.order_id = o.id AND oi2.item_type IN ('reform', 'custom')
      LIMIT 1
    ) AS item_data,
    SUM(oi.quantity)::integer AS item_quantity
  FROM public.order_items oi
  WHERE oi.order_id = o.id AND oi.item_type IN ('reform', 'custom')
) ri ON o.order_type IN ('custom', 'repair');

CREATE OR REPLACE VIEW public.admin_order_item_view
WITH (security_invoker = true)
AS
SELECT
  oi.id,
  oi.order_id      AS "orderId",
  oi.item_id       AS "itemId",
  oi.item_type     AS "itemType",
  oi.product_id    AS "productId",
  oi.selected_option_id AS "selectedOptionId",
  oi.item_data     AS "reformData",
  oi.quantity,
  oi.unit_price    AS "unitPrice",
  oi.discount_amount     AS "discountAmount",
  oi.line_discount_amount AS "lineDiscountAmount",
  oi.applied_user_coupon_id AS "appliedUserCouponId",
  oi.created_at,
  pr.name  AS "productName",
  pr.code  AS "productCode",
  pr.image AS "productImage"
FROM public.order_items oi
LEFT JOIN public.products pr ON pr.id = oi.product_id;

-- SECTION 3 — Re-create create_order_txn
CREATE OR REPLACE FUNCTION public.create_order_txn(p_shipping_address_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
          and po.id::text = v_selected_option_id
        for update;

        if not found then
          raise exception 'Selected option not found';
        end if;

        if v_option_stock is not null then
          if v_option_stock < v_quantity then
            raise exception 'Insufficient stock for option';
          end if;
          update product_options
          set stock = stock - v_quantity
          where product_id = v_product_id
            and id::text = v_selected_option_id;
        end if;
      else
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

      if v_reform_base_cost is null then
        SELECT amount INTO v_reform_base_cost
        FROM custom_order_pricing_constants WHERE key = 'REFORM_BASE_COST';
        IF v_reform_base_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_BASE_COST';
        END IF;

        SELECT amount INTO v_reform_shipping_cost
        FROM custom_order_pricing_constants WHERE key = 'REFORM_SHIPPING_COST';
        IF v_reform_shipping_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_SHIPPING_COST';
        END IF;
      end if;

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
        selected_option_id, item_data, quantity,
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

  if jsonb_array_length(v_reform_items) > 0 then
    v_order_number := generate_order_number();
    v_shipping_cost := v_reform_shipping_cost;
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
        selected_option_id, item_data, quantity,
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
    set status = 'reserved',
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
$$;

-- SECTION 4 — Re-create create_custom_order_txn
CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_images jsonb DEFAULT '[]'::jsonb,
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
  v_elem jsonb;
  v_idx integer;
  v_base_unit integer;
  v_remainder integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
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
         or not (v_elem ? 'file_id')
         or jsonb_typeof(v_elem->'url') <> 'string'
         or jsonb_typeof(v_elem->'file_id') not in ('string', 'null') then
        raise exception 'p_reference_images[%] must be an object with string "url" and "file_id" keys, and "file_id" must be a string or null', v_idx;
      end if;
      v_idx := v_idx + 1;
    end loop;
  end if;

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

  v_base_unit := floor(v_total_cost::numeric / p_quantity)::integer;
  v_remainder := v_total_cost - v_base_unit * p_quantity;

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
    'reference_images', coalesce(p_reference_images, '[]'::jsonb),
    'additional_notes', coalesce(p_additional_notes, ''),
    'sample', coalesce(p_sample, false),
    'sample_type', p_sample_type,
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'total_cost', v_total_cost,
      'unit_price_remainder', v_remainder
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
