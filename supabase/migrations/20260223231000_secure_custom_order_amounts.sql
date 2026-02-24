create table if not exists public.custom_order_pricing_constants (
  key text primary key,
  amount integer not null check (amount >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_order_fabric_prices (
  design_type text not null,
  fabric_type text not null,
  unit_price integer not null check (unit_price >= 0),
  updated_at timestamptz not null default now(),
  primary key (design_type, fabric_type),
  constraint custom_order_fabric_prices_design_type_check
    check (design_type in ('YARN_DYED', 'PRINTING')),
  constraint custom_order_fabric_prices_fabric_type_check
    check (fabric_type in ('SILK', 'POLY'))
);

alter table public.custom_order_pricing_constants enable row level security;
alter table public.custom_order_fabric_prices enable row level security;

revoke all on table public.custom_order_pricing_constants from public;
revoke all on table public.custom_order_pricing_constants from anon;
revoke all on table public.custom_order_pricing_constants from authenticated;
revoke all on table public.custom_order_pricing_constants from service_role;
revoke all on table public.custom_order_fabric_prices from public;
revoke all on table public.custom_order_fabric_prices from anon;
revoke all on table public.custom_order_fabric_prices from authenticated;
revoke all on table public.custom_order_fabric_prices from service_role;

grant select, insert, update, delete on table public.custom_order_pricing_constants to service_role;
grant select, insert, update, delete on table public.custom_order_fabric_prices to service_role;

drop policy if exists custom_order_pricing_constants_service_role_only
  on public.custom_order_pricing_constants;
create policy custom_order_pricing_constants_service_role_only
on public.custom_order_pricing_constants
as restrictive
for all
to service_role, postgres
using (true)
with check (true);

drop policy if exists custom_order_fabric_prices_service_role_only
  on public.custom_order_fabric_prices;
create policy custom_order_fabric_prices_service_role_only
on public.custom_order_fabric_prices
as restrictive
for all
to service_role, postgres
using (true)
with check (true);

insert into public.custom_order_pricing_constants (key, amount)
values
  ('START_COST', 50000),
  ('SEWING_PER_COST', 4000),
  ('AUTO_TIE_COST', 1000),
  ('TRIANGLE_STITCH_COST', 1000),
  ('SIDE_STITCH_COST', 1000),
  ('BAR_TACK_COST', 1000),
  ('DIMPLE_COST', 12000),
  ('SPODERATO_COST', 30000),
  ('FOLD7_COST', 60000),
  ('WOOL_INTERLINING_COST', 500),
  ('BRAND_LABEL_COST', 300),
  ('CARE_LABEL_COST', 300),
  ('YARN_DYED_DESIGN_COST', 100000)
on conflict (key) do nothing;

insert into public.custom_order_fabric_prices (design_type, fabric_type, unit_price)
values
  ('YARN_DYED', 'SILK', 25000),
  ('YARN_DYED', 'POLY', 20000),
  ('PRINTING', 'SILK', 20000),
  ('PRINTING', 'POLY', 8000)
on conflict (design_type, fabric_type) do nothing;

create or replace function public.calculate_custom_order_amounts(
  p_options jsonb,
  p_quantity integer
)
returns table (
  sewing_cost integer,
  fabric_cost integer,
  total_cost integer
)
language plpgsql
security definer
set search_path = public
as $function$
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
$function$;

create or replace function public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_image_urls text[] default '{}'::text[],
  p_additional_notes text default '',
  p_sample boolean default false
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
    1,
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
$function$;

revoke all on function public.calculate_custom_order_amounts(jsonb, integer)
from public;
revoke all on function public.calculate_custom_order_amounts(jsonb, integer)
from anon;
revoke all on function public.calculate_custom_order_amounts(jsonb, integer)
from authenticated;

grant execute on function public.calculate_custom_order_amounts(jsonb, integer)
to service_role;

revoke all on function public.create_custom_order_txn(uuid, jsonb, integer, text[], text, boolean)
from public;
revoke all on function public.create_custom_order_txn(uuid, jsonb, integer, text[], text, boolean)
from anon;
grant execute on function public.create_custom_order_txn(uuid, jsonb, integer, text[], text, boolean)
to authenticated;
grant execute on function public.create_custom_order_txn(uuid, jsonb, integer, text[], text, boolean)
to service_role;
