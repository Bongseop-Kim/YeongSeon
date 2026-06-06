ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    '대기중','결제중','진행중','배송중','배송완료','완료','취소','실패',
    '접수','제작중','제작완료',
    '수선중','수선완료',
    '발송대기','발송중','발송확인중','수거예정'
  ]));

COMMENT ON CONSTRAINT orders_status_check ON public.orders
IS 'Allows shared order lifecycle statuses, including repair pickup and no-tracking states.';

INSERT INTO public.pricing_constants (key, amount, category)
VALUES ('REFORM_PICKUP_FEE', 3000, 'reform')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.pricing_constants
IS 'Unified pricing constants, including REFORM_PICKUP_FEE for repair pickup requests.';

CREATE TABLE IF NOT EXISTS public.repair_pickup_requests (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id        uuid        NOT NULL,
  recipient_name  text        NOT NULL,
  recipient_phone text        NOT NULL,
  postal_code     text,
  address         text        NOT NULL,
  detail_address  text,
  pickup_fee      integer     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT repair_pickup_requests_pkey PRIMARY KEY (id),
  CONSTRAINT repair_pickup_requests_order_id_key UNIQUE (order_id),
  CONSTRAINT repair_pickup_requests_fee_check CHECK (pickup_fee >= 0),
  CONSTRAINT repair_pickup_requests_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE CASCADE
);

COMMENT ON TABLE public.repair_pickup_requests
IS 'Repair order pickup requests created during order creation; pickup_fee stores the REFORM_PICKUP_FEE snapshot.';

ALTER TABLE public.repair_pickup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repair_pickup_requests_owner_select"
  ON public.repair_pickup_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "repair_pickup_requests_admin_select"
  ON public.repair_pickup_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.repair_shipping_receipts (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id     uuid        NOT NULL,
  receipt_type text        NOT NULL,
  reason       text,
  memo         text,
  photos       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT repair_shipping_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT repair_shipping_receipts_type_check
    CHECK (receipt_type IN ('tracking', 'no_tracking')),
  CONSTRAINT repair_shipping_receipts_reason_check
    CHECK (reason IS NULL OR reason IN ('quick', 'overseas', 'lost')),
  CONSTRAINT repair_shipping_receipts_no_tracking_reason_check
    CHECK (receipt_type <> 'no_tracking' OR reason IS NOT NULL),
  CONSTRAINT repair_shipping_receipts_memo_length_check
    CHECK (memo IS NULL OR char_length(memo) <= 500),
  CONSTRAINT repair_shipping_receipts_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE CASCADE
);

COMMENT ON TABLE public.repair_shipping_receipts
IS 'Customer repair shipping receipt records for tracking and no-tracking submissions; photos store ImageKit url/fileId objects.';

CREATE INDEX idx_repair_shipping_receipts_order_id
  ON public.repair_shipping_receipts (order_id);

ALTER TABLE public.repair_shipping_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repair_shipping_receipts_owner_select"
  ON public.repair_shipping_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "repair_shipping_receipts_admin_select"
  ON public.repair_shipping_receipts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE UNIQUE INDEX idx_images_repair_shipping_upload_unique
  ON public.images (entity_type, entity_id)
  WHERE entity_type = 'repair_shipping_upload';

CREATE OR REPLACE FUNCTION public.register_repair_shipping_upload(
  p_url     text,
  p_file_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF nullif(trim(p_url), '') IS NULL THEN
    RAISE EXCEPTION 'Repair shipping image url is required';
  END IF;

  IF nullif(trim(p_file_id), '') IS NULL THEN
    RAISE EXCEPTION 'Repair shipping image file id is required';
  END IF;

  INSERT INTO public.images (
    url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at
  )
  VALUES (
    p_url, p_file_id, '/repair-shipping', 'repair_shipping_upload', p_file_id, v_user_id, NULL
  )
  ON CONFLICT (entity_type, entity_id)
    WHERE entity_type = 'repair_shipping_upload'
  DO UPDATE
  SET url = EXCLUDED.url,
      file_id = EXCLUDED.file_id,
      folder = EXCLUDED.folder,
      uploaded_by = EXCLUDED.uploaded_by,
      expires_at = EXCLUDED.expires_at,
      deleted_at = NULL,
      deletion_claimed_at = NULL
  WHERE public.images.uploaded_by = v_user_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Repair shipping upload ownership conflict';
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_repair_shipping_upload(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_order_admin_actions(
  p_order_type text,
  p_status     text
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_status IN ('완료', '취소', '실패') THEN ARRAY[]::text[]

    WHEN p_order_type = 'sale' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '진행중'   THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'custom' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '제작완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'sample' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'repair' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['cancel']
      WHEN '결제중'   THEN ARRAY['cancel']
      WHEN '발송대기' THEN ARRAY['cancel']
      WHEN '발송중'   THEN ARRAY['advance', 'cancel']
      WHEN '발송확인중' THEN ARRAY['advance', 'cancel']
      WHEN '수거예정' THEN ARRAY['advance', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback']
      WHEN '수선중'   THEN ARRAY['advance', 'rollback']
      WHEN '수선완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'token' THEN CASE p_status
      WHEN '대기중' THEN ARRAY['advance', 'cancel']
      WHEN '결제중' THEN ARRAY['rollback', 'cancel']
      ELSE ARRAY[]::text[]
    END

    ELSE ARRAY[]::text[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_order_customer_actions(
  p_order_type text,
  p_status     text,
  p_order_id   uuid DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_actions          text[] := ARRAY[]::text[];
  v_has_active_claim boolean := false;
begin
  IF (p_order_type = 'sale'   AND p_status IN ('대기중', '진행중'))
  OR (p_order_type = 'custom' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'sample' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'repair' AND p_status IN ('대기중', '발송대기', '발송중', '발송확인중', '수거예정'))
  OR (p_order_type = 'token'  AND p_status = '대기중')
  THEN
    v_actions := v_actions || ARRAY['claim_cancel'];
  END IF;

  IF p_order_type = 'sale' AND p_status IN ('배송중', '배송완료') THEN
    v_actions := v_actions || ARRAY['claim_return', 'claim_exchange'];
  END IF;

  IF p_order_type <> 'token' AND p_status IN ('배송중', '배송완료') THEN
    IF p_order_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.order_id = p_order_id
          AND c.status IN ('접수', '처리중', '수거요청', '수거완료', '재발송')
      ) INTO v_has_active_claim;

      IF NOT v_has_active_claim THEN
        v_actions := v_actions || ARRAY['confirm_purchase'];
      END IF;
    ELSE
      v_actions := v_actions || ARRAY['confirm_purchase'];
    END IF;
  END IF;

  RETURN v_actions;
end;
$$;

DROP FUNCTION public.create_order_txn(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.create_order_txn(
  p_shipping_address_id uuid,
  p_items jsonb,
  p_repair_shipping jsonb DEFAULT NULL
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
  v_reform_width_cost integer;
  v_used_coupon_ids uuid[] := '{}'::uuid[];
  v_coupon record;

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
  v_tie_image text;
  v_tie_file_id text;
  v_has_length_reform boolean;
  v_has_width_reform boolean;
  v_reform_image_row_count integer;
  v_repair_method text;
  v_pickup jsonb;
  v_pickup_fee integer := 0;
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

  if p_repair_shipping is not null and p_repair_shipping <> 'null'::jsonb then
    v_repair_method := p_repair_shipping->>'method';
    if v_repair_method is null or v_repair_method not in ('direct', 'pickup') then
      raise exception 'Invalid repair shipping method: %', coalesce(v_repair_method, '(null)');
    end if;
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
        FROM pricing_constants WHERE key = 'REFORM_BASE_COST';
        IF v_reform_base_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_BASE_COST';
        END IF;
        SELECT amount INTO v_reform_shipping_cost
        FROM pricing_constants WHERE key = 'REFORM_SHIPPING_COST';
        IF v_reform_shipping_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_SHIPPING_COST';
        END IF;
      end if;

      if v_reform_data is null or v_reform_data = 'null'::jsonb then
        raise exception 'Reform data is required';
      end if;

      v_has_length_reform := coalesce((v_reform_data->'tie'->>'hasLengthReform')::boolean, true);
      v_has_width_reform := coalesce((v_reform_data->'tie'->>'hasWidthReform')::boolean, false);

      if not v_has_length_reform and not v_has_width_reform then
        raise exception 'At least one reform service must be selected';
      end if;

      if v_has_width_reform and v_reform_width_cost is null then
        SELECT amount INTO v_reform_width_cost
        FROM pricing_constants WHERE key = 'REFORM_WIDTH_COST';
        IF v_reform_width_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_WIDTH_COST';
        END IF;
      end if;

      v_unit_price :=
        (case when v_has_length_reform then v_reform_base_cost else 0 end) +
        (case when v_has_width_reform then coalesce(v_reform_width_cost, 0) else 0 end);

      v_reform_data := jsonb_set(v_reform_data, '{cost}', to_jsonb(v_unit_price), true);
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

  if v_repair_method = 'pickup' and jsonb_array_length(v_reform_items) = 0 then
    raise exception 'Pickup is only available for repair orders';
  end if;

  if jsonb_array_length(v_reform_items) > 0 then
    v_order_number := generate_order_number();
    v_shipping_cost := v_reform_shipping_cost;

    if v_repair_method = 'pickup' then
      v_pickup := p_repair_shipping->'pickup';
      if v_pickup is null or v_pickup = 'null'::jsonb then
        raise exception 'Pickup info is required';
      end if;
      if nullif(trim(coalesce(v_pickup->>'recipient_name', '')), '') is null
        or nullif(trim(coalesce(v_pickup->>'recipient_phone', '')), '') is null
        or nullif(trim(coalesce(v_pickup->>'address', '')), '') is null then
        raise exception 'Pickup recipient name, phone and address are required';
      end if;

      SELECT amount INTO v_pickup_fee
      FROM pricing_constants WHERE key = 'REFORM_PICKUP_FEE';
      IF v_pickup_fee IS NULL THEN
        RAISE EXCEPTION 'Missing pricing constant: REFORM_PICKUP_FEE';
      END IF;
    end if;

    v_total_price := v_reform_original - v_reform_discount + v_shipping_cost + v_pickup_fee;

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

    if v_repair_method = 'pickup' then
      insert into repair_pickup_requests (
        order_id, recipient_name, recipient_phone,
        postal_code, address, detail_address, pickup_fee
      )
      values (
        v_order_id,
        trim(v_pickup->>'recipient_name'),
        trim(v_pickup->>'recipient_phone'),
        nullif(trim(coalesce(v_pickup->>'postal_code', '')), ''),
        trim(v_pickup->>'address'),
        nullif(trim(coalesce(v_pickup->>'detail_address', '')), ''),
        v_pickup_fee
      );
    end if;

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

      v_tie_image := nullif(trim(v_item->'reform_data'->'tie'->>'image'), '');
      v_tie_file_id := nullif(trim(v_item->'reform_data'->'tie'->>'fileId'), '');
      IF v_tie_image IS NOT NULL THEN
        IF v_tie_file_id IS NULL THEN
          RAISE EXCEPTION 'Reform image file id is required';
        END IF;

        UPDATE public.images
        SET folder = '/reform',
            entity_type = 'reform',
            entity_id = v_order_id::text
        WHERE entity_type = 'reform_upload'
          AND entity_id = v_tie_file_id
          AND file_id = v_tie_file_id
          AND url = v_tie_image
          AND uploaded_by = v_user_id;

        GET DIAGNOSTICS v_reform_image_row_count = ROW_COUNT;
        IF v_reform_image_row_count = 0 THEN
          RAISE EXCEPTION 'Reform image not found or not owned';
        END IF;
      END IF;
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

COMMENT ON FUNCTION public.create_order_txn(uuid, jsonb, jsonb)
IS 'Security definer reason: creates orders, order_items, pickup requests, image links, and coupon reservations atomically with function-owner write privileges while enforcing auth.uid ownership checks and fixed search_path.';

CREATE OR REPLACE FUNCTION public.confirm_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid,
  p_payment_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_post_status text;
  v_updated_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_caller_role text;
  v_masked_key text;
  v_token_amount integer;
  v_plan_key text;
  v_plan_label text;
  v_sample_coupon_id uuid;
  v_coupon_row_count integer := 0;
  v_sample_type text;
  v_sample_design_type text;
  v_coupon_name text;
  v_pricing_key text;
  v_discount_amount integer;
begin

  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if p_payment_key is null or trim(p_payment_key) = '' then
    raise exception 'payment_key is required';
  end if;

  v_caller_role := auth.role();

  if auth.uid() is null then
    if v_caller_role is distinct from 'service_role' then
      raise exception 'Forbidden';
    end if;
  elsif p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  v_masked_key := case
    when length(p_payment_key) <= 8 then '****'
    else '****' || right(p_payment_key, 8)
  end;

  for v_order in
    select id, user_id, status, order_type
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status != '결제중' then
      if v_order.status in ('진행중', '발송대기', '발송중', '수거예정', '접수', '완료') then
        v_updated_orders := v_updated_orders || jsonb_build_object(
          'orderId',     v_order.id,
          'orderType',   v_order.order_type,
          'tokenAmount', null,
          'couponIssued', null
        );
        continue;
      end if;

      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_post_status := case v_order.order_type
      when 'sale'   then '진행중'
      when 'token'  then '완료'
      when 'sample' then '접수'
      when 'repair' then case
        when exists (
          select 1 from public.repair_pickup_requests r
          where r.order_id = v_order.id
        ) then '수거예정'
        else '발송대기'
      end
      else '접수'
    end;

    update public.orders
    set status = v_post_status, payment_key = p_payment_key, updated_at = now()
    where id = v_order.id;

    insert into public.order_status_logs (
      order_id, changed_by, previous_status, new_status, memo
    ) values (
      v_order.id, p_user_id, v_order.status, v_post_status,
      'payment confirmed: ' || v_masked_key
    );

    if v_order.order_type = 'token' then
      select
        (oi.item_data->>'token_amount')::integer,
        oi.item_data->>'plan_key'
      into v_token_amount, v_plan_key
      from public.order_items oi
      where oi.order_id = v_order.id and oi.item_type = 'token'
      limit 1;

      if v_token_amount is null or v_token_amount <= 0 then
        raise exception 'token order % has no valid token_amount (plan_key: %)', v_order.id, v_plan_key;
      end if;

      v_plan_label := case v_plan_key
        when 'starter' then 'Starter'
        when 'popular' then 'Popular'
        when 'pro'     then 'Pro'
        else v_plan_key
      end;

      insert into public.design_tokens (
        user_id, amount, type, token_class, description, work_id,
        source_order_id, expires_at
      )
      values (
        p_user_id,
        v_token_amount,
        'purchase',
        'paid',
        '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개)',
        'order_' || v_order.id::text,
        v_order.id,
        now() + interval '1 year'
      )
      on conflict (work_id) where work_id is not null do nothing;
    end if;

    v_coupon_row_count := 0;
    if v_order.order_type = 'sample' then

      select oi.item_data->>'sample_type',
             oi.item_data->'options'->>'design_type'
      into v_sample_type, v_sample_design_type
      from public.order_items oi
      where oi.order_id = v_order.id and oi.item_type = 'sample'
      limit 1;

      select mapped.coupon_name, mapped.pricing_key
      into v_coupon_name, v_pricing_key
      from public.get_sample_coupon_and_pricing(
        v_sample_type,
        v_sample_design_type
      ) as mapped;

      select pc.amount into v_discount_amount
      from public.pricing_constants pc
      where pc.key = v_pricing_key;

      if v_discount_amount is null then
        raise exception 'Sample discount pricing key % is not configured; coupons_name_unique upsert cannot continue', v_pricing_key;
      end if;

      insert into public.coupons (name, discount_type, discount_value, max_discount_amount, expiry_date, is_active)
      values (v_coupon_name, 'fixed', v_discount_amount, v_discount_amount, '2099-12-31', true)
      on conflict (name)
      do update set discount_value = excluded.discount_value,
                   max_discount_amount = excluded.max_discount_amount,
                   discount_type = excluded.discount_type,
                   expiry_date = excluded.expiry_date,
                   is_active = excluded.is_active
      returning id into v_sample_coupon_id;

      if v_sample_coupon_id is not null then
        insert into public.user_coupons (user_id, coupon_id, status)
        values (p_user_id, v_sample_coupon_id, 'active')
        on conflict (user_id, coupon_id) do nothing;

        get diagnostics v_coupon_row_count = row_count;
      end if;
    end if;

    v_updated_orders := v_updated_orders || jsonb_build_object(
      'orderId',     v_order.id,
      'orderType',   v_order.order_type,
      'tokenAmount', case when v_order.order_type = 'token' then v_token_amount else null end,
      'couponIssued', case when v_order.order_type = 'sample' then (v_coupon_row_count > 0) else null end
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  update public.user_coupons
  set status = 'used',
      used_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and status = 'reserved'
    and id in (
      select distinct oi.applied_user_coupon_id
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.payment_group_id = p_payment_group_id
        and oi.applied_user_coupon_id is not null
    );

  return jsonb_build_object(
    'success', true,
    'orders', v_updated_orders
  );
end;
$$;

COMMENT ON FUNCTION public.confirm_payment_orders(uuid, uuid, text)
IS 'Security definer reason: service-role payment confirmation updates orders, coupon state, token balances, and audit logs with function-owner privileges while validating user ownership and fixed search_path.';

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text DEFAULT NULL::text,
  p_is_rollback boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid := auth.uid();
  v_current_status text;
  v_order_type text;
  v_repair_previous_status text;
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
        (v_current_status = '결제중'   and p_new_status = '대기중')
        or (v_current_status = '접수'   and p_new_status = '대기중')
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
      select case
        when exists (
          select 1
          from public.repair_pickup_requests r
          where r.order_id = p_order_id
        ) then '수거예정'
        when exists (
          select 1
          from public.repair_shipping_receipts r
          where r.order_id = p_order_id
            and r.receipt_type = 'no_tracking'
        ) then '발송확인중'
        else '발송중'
      end
      into v_repair_previous_status;

      if not (
        (v_current_status = '접수' and p_new_status = v_repair_previous_status)
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
        (v_current_status = '대기중'   and p_new_status = '진행중')
        or (v_current_status = '진행중'   and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'   and p_new_status = '제작중')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
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

        or (v_current_status = '발송확인중' and p_new_status = '접수')

        or (v_current_status = '수거예정' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '발송대기', '발송중', '발송확인중', '수거예정'))
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

COMMENT ON FUNCTION public.admin_update_order_status(uuid, text, text, boolean)
IS 'Security definer reason: admin-only status transitions update orders and audit logs with function-owner privileges after public.is_admin and transition validation.';

DROP FUNCTION public.submit_repair_tracking(uuid, text, text);
DROP FUNCTION IF EXISTS public.submit_repair_no_tracking(uuid, text, text);

CREATE OR REPLACE FUNCTION public.submit_repair_tracking(
  p_order_id uuid,
  p_courier_company text,
  p_tracking_number text,
  p_photos jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order record;
  v_courier_code text;
  v_tracking_number text;
  v_photos jsonb;
  v_photo jsonb;
  v_photo_url text;
  v_photo_file_id text;
  v_photo_row_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_courier_company is null or trim(p_courier_company) = '' then
    raise exception '택배사를 선택해주세요';
  end if;

  v_courier_code := lower(trim(p_courier_company));
  if v_courier_code not in ('cj', 'hanjin', 'logen', 'epost', 'lotte', 'kyungdong') then
    raise exception '지원하지 않는 택배사 코드입니다: % (허용 값: cj, hanjin, logen, epost, lotte, kyungdong)', p_courier_company;
  end if;

  if p_tracking_number is null or trim(p_tracking_number) = '' then
    raise exception '송장번호를 입력해주세요';
  end if;

  v_tracking_number := trim(p_tracking_number);

  v_photos := coalesce(p_photos, '[]'::jsonb);
  if jsonb_typeof(v_photos) <> 'array' then
    raise exception '발송 사진 형식이 올바르지 않습니다';
  end if;
  if jsonb_array_length(v_photos) > 3 then
    raise exception '발송 사진은 최대 3장까지 첨부할 수 있습니다';
  end if;

  select id, user_id, status
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception '주문을 찾을 수 없습니다';
  end if;

  if v_order.user_id is distinct from v_user_id then
    raise exception 'Forbidden';
  end if;

  if v_order.status != '발송대기' then
    raise exception '발송대기 상태에서만 송장번호를 등록할 수 있습니다 (현재 상태: %)', v_order.status;
  end if;

  update public.orders
  set
    status          = '발송중',
    courier_company = v_courier_code,
    tracking_number = v_tracking_number,
    shipped_at      = now(),
    updated_at      = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_user_id, '발송대기', '발송중',
    '고객 발송 처리: ' || v_courier_code || ' ' || v_tracking_number
  );

  if jsonb_array_length(v_photos) > 0 then
    for v_photo in select * from jsonb_array_elements(v_photos)
    loop
      v_photo_url := nullif(trim(coalesce(v_photo->>'url', '')), '');
      v_photo_file_id := nullif(trim(coalesce(v_photo->>'fileId', '')), '');
      if v_photo_url is null or v_photo_file_id is null then
        raise exception '발송 사진 정보가 올바르지 않습니다';
      end if;

      update public.images
      set folder = '/repair-shipping',
          entity_type = 'repair_shipping',
          entity_id = p_order_id::text
      where entity_type = 'repair_shipping_upload'
        and entity_id = v_photo_file_id
        and file_id = v_photo_file_id
        and url = v_photo_url
        and uploaded_by = v_user_id;

      get diagnostics v_photo_row_count = row_count;
      if v_photo_row_count = 0 then
        raise exception 'Repair shipping photo not found or not owned';
      end if;
    end loop;

  end if;

  insert into public.repair_shipping_receipts (
    order_id, receipt_type, photos
  ) values (
    p_order_id, 'tracking', coalesce(v_photos, p_photos, '[]'::jsonb)
  );
end;
$$;

COMMENT ON FUNCTION public.submit_repair_tracking(uuid, text, text, jsonb)
IS 'Security definer reason: allows authenticated order owners to update repair tracking, image linkage, and audit-log tables with function-owner privileges while enforcing auth.uid ownership checks.';

GRANT EXECUTE ON FUNCTION public.submit_repair_tracking(uuid, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_repair_no_tracking(
  p_order_id uuid,
  p_reason text,
  p_memo text DEFAULT NULL,
  p_photos jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order record;
  v_reason text;
  v_memo text;
  v_photos jsonb;
  v_photo jsonb;
  v_photo_url text;
  v_photo_file_id text;
  v_photo_row_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null or v_reason not in ('quick', 'overseas', 'lost') then
    raise exception '접수 사유를 선택해주세요 (허용 값: quick, overseas, lost)';
  end if;

  v_memo := nullif(trim(coalesce(p_memo, '')), '');
  if v_memo is not null and char_length(v_memo) > 500 then
    raise exception '메모는 500자 이내로 입력해주세요';
  end if;

  v_photos := coalesce(p_photos, '[]'::jsonb);
  if jsonb_typeof(v_photos) <> 'array' then
    raise exception '발송 사진 형식이 올바르지 않습니다';
  end if;
  if jsonb_array_length(v_photos) > 3 then
    raise exception '발송 사진은 최대 3장까지 첨부할 수 있습니다';
  end if;

  select id, user_id, status
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception '주문을 찾을 수 없습니다';
  end if;

  if v_order.user_id is distinct from v_user_id then
    raise exception 'Forbidden';
  end if;

  if v_order.status != '발송대기' then
    raise exception '발송대기 상태에서만 접수할 수 있습니다 (현재 상태: %)', v_order.status;
  end if;

  update public.orders
  set
    status     = '발송확인중',
    shipped_at = now(),
    updated_at = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_user_id, '발송대기', '발송확인중',
    '고객 송장 없는 발송 접수: ' || v_reason
  );

  if jsonb_array_length(v_photos) > 0 then
    for v_photo in select * from jsonb_array_elements(v_photos)
    loop
      v_photo_url := nullif(trim(coalesce(v_photo->>'url', '')), '');
      v_photo_file_id := nullif(trim(coalesce(v_photo->>'fileId', '')), '');
      if v_photo_url is null or v_photo_file_id is null then
        raise exception '발송 사진 정보가 올바르지 않습니다';
      end if;

      update public.images
      set folder = '/repair-shipping',
          entity_type = 'repair_shipping',
          entity_id = p_order_id::text
      where entity_type = 'repair_shipping_upload'
        and entity_id = v_photo_file_id
        and file_id = v_photo_file_id
        and url = v_photo_url
        and uploaded_by = v_user_id;

      get diagnostics v_photo_row_count = row_count;
      if v_photo_row_count = 0 then
        raise exception 'Repair shipping photo not found or not owned';
      end if;
    end loop;
  end if;

  insert into public.repair_shipping_receipts (
    order_id, receipt_type, reason, memo, photos
  ) values (
    p_order_id, 'no_tracking', v_reason, v_memo, v_photos
  );
end;
$$;

COMMENT ON FUNCTION public.submit_repair_no_tracking(uuid, text, text, jsonb)
IS 'Security definer reason: allows authenticated order owners to submit no-tracking repair receipts, image linkage, and audit logs with function-owner privileges while enforcing auth.uid ownership checks.';

GRANT EXECUTE ON FUNCTION public.submit_repair_no_tracking(uuid, text, text, jsonb) TO authenticated;
