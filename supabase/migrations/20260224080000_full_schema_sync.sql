-- =============================================================
-- Full schema sync: remote DB ↔ schemas alignment
-- Covers drift caused by migration squash not re-executing SQL
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. CRITICAL: Create missing custom order pricing tables
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_order_pricing_constants (
  key        text        NOT NULL,
  amount     integer     NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_order_pricing_constants_pkey PRIMARY KEY (key),
  CONSTRAINT custom_order_pricing_constants_amount_check CHECK (amount >= 0)
);

ALTER TABLE public.custom_order_pricing_constants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_order_pricing_constants_service_role_only" ON public.custom_order_pricing_constants;
CREATE POLICY "custom_order_pricing_constants_service_role_only"
  ON public.custom_order_pricing_constants
  AS PERMISSIVE
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.custom_order_fabric_prices (
  design_type text        NOT NULL,
  fabric_type text        NOT NULL,
  unit_price  integer     NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_order_fabric_prices_pkey PRIMARY KEY (design_type, fabric_type),
  CONSTRAINT custom_order_fabric_prices_design_type_check
    CHECK (design_type = ANY (ARRAY['YARN_DYED','PRINTING'])),
  CONSTRAINT custom_order_fabric_prices_fabric_type_check
    CHECK (fabric_type = ANY (ARRAY['SILK','POLY'])),
  CONSTRAINT custom_order_fabric_prices_unit_price_check
    CHECK (unit_price >= 0)
);

ALTER TABLE public.custom_order_fabric_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_order_fabric_prices_service_role_only" ON public.custom_order_fabric_prices;
CREATE POLICY "custom_order_fabric_prices_service_role_only"
  ON public.custom_order_fabric_prices
  AS PERMISSIVE
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. CRITICAL: Create calculate_custom_order_amounts function
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_custom_order_amounts(p_options jsonb, p_quantity integer)
RETURNS TABLE (sewing_cost integer, fabric_cost integer, total_cost integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. CRITICAL: Replace create_custom_order_txn (old → server-side pricing)
-- ─────────────────────────────────────────────────────────────

-- Drop old signature (9 params with p_sewing_cost/p_fabric_cost/p_total_cost)
DROP FUNCTION IF EXISTS public.create_custom_order_txn(uuid, jsonb, integer, integer, integer, integer, text[], text, boolean);

CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_image_urls text[] DEFAULT '{}'::text[],
  p_additional_notes text DEFAULT '',
  p_sample boolean DEFAULT false
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
    status
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
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
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. CRITICAL: Replace get_products_by_ids (add detailImages)
-- ─────────────────────────────────────────────────────────────

-- Drop legacy view that depends on old function signature
DROP VIEW IF EXISTS public.order_items_view;

-- Drop old function (different return type requires DROP first)
DROP FUNCTION IF EXISTS public.get_products_by_ids(integer[]);

CREATE OR REPLACE FUNCTION public.get_products_by_ids(p_ids integer[])
RETURNS TABLE (
  id            integer,
  code          character varying,
  name          character varying,
  price         integer,
  image         text,
  "detailImages" text[],
  category      character varying,
  color         character varying,
  pattern       character varying,
  material      character varying,
  info          text,
  created_at    timestamp with time zone,
  updated_at    timestamp with time zone,
  options       jsonb,
  likes         integer,
  "isLiked"     boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  select
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images as "detailImages",
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.option_id,
          'name', po.name,
          'additionalPrice', po.additional_price
        )
        order by po.option_id
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(lc.likes, 0) as likes,
    coalesce(public.product_is_liked_rpc(p.id), false) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join product_like_counts_rpc() lc on lc.product_id = p.id
  where p.id = any (p_ids)
  group by
    p.id, p.code, p.name, p.price, p.image, p.detail_images,
    p.category, p.color, p.pattern, p.material, p.info,
    p.created_at, p.updated_at, lc.likes
  order by p.id;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. HIGH: Strengthen inquiries constraints
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_title_check;
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_title_check
  CHECK (char_length(title) BETWEEN 1 AND 200);

ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_content_check;
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_content_check
  CHECK (char_length(content) BETWEEN 1 AND 5000);

-- answer_pair_check: answer and answer_date must both be null or both non-null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_answer_pair_check'
  ) THEN
    ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_answer_pair_check
      CHECK ((answer IS NULL AND answer_date IS NULL) OR (answer IS NOT NULL AND answer_date IS NOT NULL));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6. HIGH: Add claims active-per-item unique index
-- ─────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_active_per_item
  ON public.claims USING btree (order_item_id, type)
  WHERE status = ANY (ARRAY['접수','처리중']);

-- ─────────────────────────────────────────────────────────────
-- 7. MEDIUM: Strengthen profiles INSERT/UPDATE policies
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role = 'customer'
    AND is_active = true
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    AND role = 'customer'
    AND is_active = true
  )
  WITH CHECK (
    auth.uid() = id
    AND role = 'customer'
    AND is_active = true
  );

-- ─────────────────────────────────────────────────────────────
-- 8. MEDIUM: Restrict claims policies to authenticated only
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;
CREATE POLICY "Users can view their own claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own claims" ON public.claims;
CREATE POLICY "Users can create their own claims"
  ON public.claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
