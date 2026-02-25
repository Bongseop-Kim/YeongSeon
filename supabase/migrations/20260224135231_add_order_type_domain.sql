drop extension if exists "pgjwt";

alter table "public"."orders" drop constraint "orders_status_check";

drop view if exists "public"."admin_claim_list_view";

drop view if exists "public"."admin_order_detail_view";

drop view if exists "public"."admin_order_list_view";

drop view if exists "public"."claim_list_view";

drop view if exists "public"."order_detail_view";

drop view if exists "public"."order_item_view";

drop view if exists "public"."order_list_view";

alter table "public"."orders" add column "order_type" text not null default 'sale'::text;

CREATE INDEX idx_orders_order_type ON public.orders USING btree (order_type);

alter table "public"."orders" add constraint "orders_order_type_check" CHECK ((order_type = ANY (ARRAY['sale'::text, 'custom'::text, 'repair'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_order_type_check";

alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['대기중'::text, '진행중'::text, '배송중'::text, '완료'::text, '취소'::text, '접수'::text, '제작중'::text, '제작완료'::text, '수선중'::text, '수선완료'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

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
    o.id AS "orderId",
    o.order_number AS "orderNumber",
    p.name AS "customerName",
    p.phone AS "customerPhone",
    oi.item_type AS "itemType",
    pr.name AS "productName"
   FROM ((((public.claims cl
     JOIN public.orders o ON ((o.id = cl.order_id)))
     JOIN public.order_items oi ON ((oi.id = cl.order_item_id)))
     LEFT JOIN public.products pr ON ((pr.id = oi.product_id)))
     LEFT JOIN public.profiles p ON ((p.id = cl.user_id)));


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
    sa.delivery_request AS "deliveryRequest"
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


CREATE OR REPLACE FUNCTION public.calculate_custom_order_amounts(p_options jsonb, p_quantity integer)
 RETURNS TABLE(sewing_cost integer, fabric_cost integer, total_cost integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_start_cost integer;
  v_sewing_per_cost integer;
  v_auto_tie_cost integer;
  v_triangle_stitch_cost integer;
  v_side_stitch_cost integer;
  v_bar_tack_cost integer;
  v_dimple_cost integer;
  v_spoderato_cost integer;
  v_fold7_cost integer;
  v_wool_interlining_cost integer;
  v_brand_label_cost integer;
  v_care_label_cost integer;
  v_yarn_dyed_design_cost integer;

  v_tie_type text;
  v_interlining text;
  v_design_type text;
  v_fabric_type text;
  v_fabric_provided boolean;

  v_triangle_stitch boolean;
  v_side_stitch boolean;
  v_bar_tack boolean;
  v_dimple boolean;
  v_spoderato boolean;
  v_fold7 boolean;
  v_brand_label boolean;
  v_care_label boolean;
  v_exclusive_style_count integer;

  v_sewing_per_unit integer;
  v_unit_fabric_cost integer;
  v_fabric_amount integer;
begin
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  select
    max(case when key = 'START_COST' then amount end),
    max(case when key = 'SEWING_PER_COST' then amount end),
    max(case when key = 'AUTO_TIE_COST' then amount end),
    max(case when key = 'TRIANGLE_STITCH_COST' then amount end),
    max(case when key = 'SIDE_STITCH_COST' then amount end),
    max(case when key = 'BAR_TACK_COST' then amount end),
    max(case when key = 'DIMPLE_COST' then amount end),
    max(case when key = 'SPODERATO_COST' then amount end),
    max(case when key = 'FOLD7_COST' then amount end),
    max(case when key = 'WOOL_INTERLINING_COST' then amount end),
    max(case when key = 'BRAND_LABEL_COST' then amount end),
    max(case when key = 'CARE_LABEL_COST' then amount end),
    max(case when key = 'YARN_DYED_DESIGN_COST' then amount end)
  into
    v_start_cost,
    v_sewing_per_cost,
    v_auto_tie_cost,
    v_triangle_stitch_cost,
    v_side_stitch_cost,
    v_bar_tack_cost,
    v_dimple_cost,
    v_spoderato_cost,
    v_fold7_cost,
    v_wool_interlining_cost,
    v_brand_label_cost,
    v_care_label_cost,
    v_yarn_dyed_design_cost
  from public.custom_order_pricing_constants
  where key = any (array[
    'START_COST',
    'SEWING_PER_COST',
    'AUTO_TIE_COST',
    'TRIANGLE_STITCH_COST',
    'SIDE_STITCH_COST',
    'BAR_TACK_COST',
    'DIMPLE_COST',
    'SPODERATO_COST',
    'FOLD7_COST',
    'WOOL_INTERLINING_COST',
    'BRAND_LABEL_COST',
    'CARE_LABEL_COST',
    'YARN_DYED_DESIGN_COST'
  ]);

  if v_start_cost is null
    or v_sewing_per_cost is null
    or v_auto_tie_cost is null
    or v_triangle_stitch_cost is null
    or v_side_stitch_cost is null
    or v_bar_tack_cost is null
    or v_dimple_cost is null
    or v_spoderato_cost is null
    or v_fold7_cost is null
    or v_wool_interlining_cost is null
    or v_brand_label_cost is null
    or v_care_label_cost is null
    or v_yarn_dyed_design_cost is null then
    raise exception 'Custom order pricing constants are not configured';
  end if;

  v_tie_type := coalesce(p_options->>'tie_type', '');
  v_interlining := coalesce(p_options->>'interlining', '');
  v_design_type := nullif(p_options->>'design_type', '');
  v_fabric_type := nullif(p_options->>'fabric_type', '');
  v_fabric_provided := coalesce((p_options->>'fabric_provided')::boolean, false);

  v_triangle_stitch := coalesce((p_options->>'triangle_stitch')::boolean, false);
  v_side_stitch := coalesce((p_options->>'side_stitch')::boolean, false);
  v_bar_tack := coalesce((p_options->>'bar_tack')::boolean, false);
  v_dimple := coalesce((p_options->>'dimple')::boolean, false);
  v_spoderato := coalesce((p_options->>'spoderato')::boolean, false);
  v_fold7 := coalesce((p_options->>'fold7')::boolean, false);
  v_brand_label := coalesce((p_options->>'brand_label')::boolean, false);
  v_care_label := coalesce((p_options->>'care_label')::boolean, false);
  v_exclusive_style_count :=
    (case when v_dimple then 1 else 0 end)
    + (case when v_spoderato then 1 else 0 end)
    + (case when v_fold7 then 1 else 0 end);

  -- dimple/spoderato/fold7 are treated as mutually exclusive sewing styles.
  if v_exclusive_style_count > 1 then
    raise exception 'Only one of dimple, spoderato, or fold7 can be selected';
  end if;

  v_sewing_per_unit := v_sewing_per_cost;

  if v_tie_type = 'AUTO' then
    v_sewing_per_unit := v_sewing_per_unit + v_auto_tie_cost;
  end if;

  if v_triangle_stitch then
    v_sewing_per_unit := v_sewing_per_unit + v_triangle_stitch_cost;
  end if;

  if v_side_stitch then
    v_sewing_per_unit := v_sewing_per_unit + v_side_stitch_cost;
  end if;

  if v_bar_tack then
    v_sewing_per_unit := v_sewing_per_unit + v_bar_tack_cost;
  end if;

  if v_dimple then
    v_sewing_per_unit := v_sewing_per_unit + v_dimple_cost;
  end if;

  if v_spoderato then
    v_sewing_per_unit := v_sewing_per_unit + v_spoderato_cost;
  end if;

  if v_fold7 then
    v_sewing_per_unit := v_sewing_per_unit + v_fold7_cost;
  end if;

  if v_interlining = 'WOOL' then
    v_sewing_per_unit := v_sewing_per_unit + v_wool_interlining_cost;
  end if;

  if v_brand_label then
    v_sewing_per_unit := v_sewing_per_unit + v_brand_label_cost;
  end if;

  if v_care_label then
    v_sewing_per_unit := v_sewing_per_unit + v_care_label_cost;
  end if;

  sewing_cost := (v_sewing_per_unit * p_quantity) + v_start_cost;

  if v_fabric_provided then
    v_fabric_amount := 0;
  elsif v_design_type is null or v_fabric_type is null then
    v_fabric_amount := 0;
  else
    select fp.unit_price
    into v_unit_fabric_cost
    from public.custom_order_fabric_prices fp
    where fp.design_type = v_design_type
      and fp.fabric_type = v_fabric_type;

    if v_unit_fabric_cost is null then
      raise exception 'Unsupported design/fabric option for custom order pricing';
    end if;

    v_fabric_amount := round(
      (p_quantity::numeric * v_unit_fabric_cost::numeric) / 4
    )::integer
      + case when v_design_type = 'YARN_DYED' then v_yarn_dyed_design_cost else 0 end;
  end if;

  fabric_cost := v_fabric_amount;
  total_cost := sewing_cost + fabric_cost;

  return next;
end;
$function$
;

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


CREATE OR REPLACE FUNCTION public.create_custom_order_txn(p_shipping_address_id uuid, p_options jsonb, p_quantity integer, p_reference_image_urls text[] DEFAULT '{}'::text[], p_additional_notes text DEFAULT ''::text, p_sample boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_sewing_cost integer;
  v_fabric_cost integer;
  v_total_cost integer;
  v_reform_data jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
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

  insert into public.orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    order_type,
    status
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
    'custom',
    '대기중'
  )
  returning id into v_order_id;

  v_reform_data := jsonb_build_object(
    'custom_order', true,
    'quantity', p_quantity,
    'options', p_options,
    'reference_image_urls', to_jsonb(coalesce(p_reference_image_urls, '{}'::text[])),
    'additional_notes', coalesce(p_additional_notes, ''),
    'sample', coalesce(p_sample, false),
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
    (v_reform_data->>'quantity')::integer,
    v_total_cost,
    0,
    0,
    null
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number
  );
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

  v_original_price integer := 0;
  v_total_discount integer := 0;
  v_total_price integer := 0;
  v_reform_base_cost constant integer := 15000;
  v_used_coupon_ids uuid[] := '{}'::uuid[];
  v_coupon record;
  v_has_reform boolean;
  v_order_type text;
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

      select p.price
      into v_unit_price
      from products p
      where p.id = v_product_id;

      if not found then
        raise exception 'Product not found';
      end if;

      if v_selected_option_id is not null then
        select coalesce(po.additional_price, 0)
        into v_option_additional_price
        from product_options po
        where po.product_id = v_product_id
          and po.option_id = v_selected_option_id
        limit 1;

        if not found then
          raise exception 'Selected option not found';
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

  v_total_price := v_original_price - v_total_discount;
  v_order_number := generate_order_number();

  v_has_reform := exists (
    select 1 from jsonb_array_elements(v_normalized_items) elem
    where elem->>'item_type' = 'reform'
  );
  v_order_type := case when v_has_reform then 'repair' else 'sale' end;

  insert into orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    order_type,
    status
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_price,
    v_original_price,
    v_total_discount,
    v_order_type,
    '대기중'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(v_normalized_items)
  loop
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
      line_discount_amount,
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
    'order_id', v_order_id,
    'order_number', v_order_number
  );
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


create or replace view "public"."order_list_view" as  SELECT o.id,
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.status,
    o.total_price AS "totalPrice",
    o.created_at
   FROM public.orders o
  WHERE (o.user_id = auth.uid());

-- ── Data migration: classify existing orders by order_type ──

-- 1. custom: reform_data에 custom_order=true가 있는 주문
UPDATE orders o SET order_type = 'custom'
WHERE EXISTS (
  SELECT 1 FROM order_items oi
  WHERE oi.order_id = o.id AND oi.item_type = 'reform'
    AND oi.reform_data->>'custom_order' = 'true'
);

-- 2. repair: reform item이 있지만 custom이 아닌 주문
UPDATE orders o SET order_type = 'repair'
WHERE order_type = 'sale'
  AND EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id = o.id AND oi.item_type = 'reform'
      AND (oi.reform_data->>'custom_order' IS NULL
           OR oi.reform_data->>'custom_order' <> 'true')
  );

-- 3. 기존 custom/repair의 '진행중' → '접수'로 매핑
UPDATE orders SET status = '접수'
WHERE order_type IN ('custom', 'repair') AND status = '진행중';

