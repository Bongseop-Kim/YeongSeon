-- =============================================================
-- Migration: create_claims_system
-- Description: Claims (cancel/return/exchange) backend —
--   table, indexes, constraints, RLS, trigger, grants,
--   generate_claim_number(), create_claim() RPC, claim_list_view
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. claims table
-- ─────────────────────────────────────────────────────────────

create table "public"."claims" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "order_id" uuid not null,
  "order_item_id" uuid not null,
  "claim_number" character varying(50) not null,
  "type" text not null,
  "status" text not null default '접수',
  "reason" text not null,
  "description" text,
  "quantity" integer not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."claims" enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 2. Constraints
-- ─────────────────────────────────────────────────────────────

alter table "public"."claims"
  add constraint "claims_pkey" primary key ("id");

alter table "public"."claims"
  add constraint "claims_claim_number_key" unique ("claim_number");

alter table "public"."claims"
  add constraint "claims_type_check"
  check ("type" in ('cancel', 'return', 'exchange'));

alter table "public"."claims"
  add constraint "claims_status_check"
  check ("status" in ('접수', '처리중', '완료', '거부'));

alter table "public"."claims"
  add constraint "claims_quantity_check"
  check ("quantity" > 0);

alter table "public"."claims"
  add constraint "claims_reason_check"
  check ("reason" in (
    'change_mind', 'defect', 'delay', 'wrong_item',
    'size_mismatch', 'color_mismatch', 'other'
  ));

-- FK constraints
alter table "public"."claims"
  add constraint "claims_user_id_fkey"
  foreign key ("user_id") references "auth"."users"("id") on delete cascade;

alter table "public"."claims"
  add constraint "claims_order_id_fkey"
  foreign key ("order_id") references "public"."orders"("id");

alter table "public"."claims"
  add constraint "claims_order_item_id_fkey"
  foreign key ("order_item_id") references "public"."order_items"("id");

-- ─────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────

create index "idx_claims_user_id" on "public"."claims" ("user_id");
create index "idx_claims_order_id" on "public"."claims" ("order_id");
create index "idx_claims_order_item_id" on "public"."claims" ("order_item_id");
create index "idx_claims_status" on "public"."claims" ("status");

-- ─────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ─────────────────────────────────────────────────────────────

create policy "Users can view their own claims"
on "public"."claims"
as permissive
for select
to public
using ((auth.uid() = user_id));

create policy "Users can create their own claims"
on "public"."claims"
as permissive
for insert
to public
with check ((auth.uid() = user_id));

-- ─────────────────────────────────────────────────────────────
-- 5. Trigger (reuse existing update_updated_at_column)
-- ─────────────────────────────────────────────────────────────

create trigger update_claims_updated_at
  before update on public.claims
  for each row
  execute function public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 6. Grants (matches existing orders table pattern)
-- ─────────────────────────────────────────────────────────────

grant delete on table "public"."claims" to "anon";
grant insert on table "public"."claims" to "anon";
grant references on table "public"."claims" to "anon";
grant select on table "public"."claims" to "anon";
grant trigger on table "public"."claims" to "anon";
grant truncate on table "public"."claims" to "anon";
grant update on table "public"."claims" to "anon";

grant delete on table "public"."claims" to "authenticated";
grant insert on table "public"."claims" to "authenticated";
grant references on table "public"."claims" to "authenticated";
grant select on table "public"."claims" to "authenticated";
grant trigger on table "public"."claims" to "authenticated";
grant truncate on table "public"."claims" to "authenticated";
grant update on table "public"."claims" to "authenticated";

grant delete on table "public"."claims" to "service_role";
grant insert on table "public"."claims" to "service_role";
grant references on table "public"."claims" to "service_role";
grant select on table "public"."claims" to "service_role";
grant trigger on table "public"."claims" to "service_role";
grant truncate on table "public"."claims" to "service_role";
grant update on table "public"."claims" to "service_role";

-- ─────────────────────────────────────────────────────────────
-- 7. generate_claim_number() function
-- ─────────────────────────────────────────────────────────────

create or replace function public.generate_claim_number()
returns text
language plpgsql
set search_path = public
as $function$
declare
  claim_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Serialize same-day claim number allocation to prevent duplicates.
  -- Uses 'CLM' prefix in hashtext to avoid collision with generate_order_number().
  perform pg_advisory_xact_lock(hashtext('CLM' || date_str));

  select coalesce(max(cast(substring(claim_number from 14) as integer)), 0) + 1
  into seq_num
  from claims
  where claim_number like 'CLM-' || date_str || '-%';

  claim_num := 'CLM-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return claim_num;
end;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 8. create_claim() RPC — SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────

create or replace function public.create_claim(
  p_type text,
  p_order_id uuid,
  p_item_id text,
  p_reason text,
  p_description text default null,
  p_quantity integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_order_item record;
  v_claim_quantity integer;
  v_claim_number text;
  v_claim_id uuid;
begin
  -- 1. Auth check
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- 2. Type validation
  if p_type not in ('cancel', 'return', 'exchange') then
    raise exception 'Invalid claim type';
  end if;

  -- 3. Reason validation
  if p_reason not in (
    'change_mind', 'defect', 'delay', 'wrong_item',
    'size_mismatch', 'color_mismatch', 'other'
  ) then
    raise exception 'Invalid claim reason';
  end if;

  -- 4. Order ownership check
  if not exists (
    select 1
    from orders
    where id = p_order_id
      and user_id = v_user_id
  ) then
    raise exception 'Order not found';
  end if;

  -- 5. Order item lookup (p_item_id is order_items.item_id text)
  select oi.id, oi.quantity
  into v_order_item
  from order_items oi
  where oi.item_id = p_item_id
    and oi.order_id = p_order_id;

  if not found then
    raise exception 'Order item not found';
  end if;

  -- 6. Quantity validation
  v_claim_quantity := coalesce(p_quantity, v_order_item.quantity);
  if v_claim_quantity <= 0 or v_claim_quantity > v_order_item.quantity then
    raise exception 'Invalid claim quantity';
  end if;

  -- 7. Duplicate claim check (same order_item_id + type with active status)
  if exists (
    select 1
    from claims
    where order_item_id = v_order_item.id
      and type = p_type
      and status in ('접수', '처리중')
  ) then
    raise exception 'Active claim already exists for this item';
  end if;

  -- 8. Generate claim number
  v_claim_number := generate_claim_number();

  -- 9. Insert claim
  insert into claims (
    user_id,
    order_id,
    order_item_id,
    claim_number,
    type,
    reason,
    description,
    quantity
  )
  values (
    v_user_id,
    p_order_id,
    v_order_item.id,
    v_claim_number,
    p_type,
    p_reason,
    p_description,
    v_claim_quantity
  )
  returning id into v_claim_id;

  return jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_number', v_claim_number
  );
end;
$function$;

revoke all on function public.create_claim(text, uuid, text, text, text, integer) from public;
revoke all on function public.create_claim(text, uuid, text, text, text, integer) from anon;
grant execute on function public.create_claim(text, uuid, text, text, text, integer) to authenticated;
grant execute on function public.create_claim(text, uuid, text, text, text, integer) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 9. claim_list_view — security_invoker = true
-- ─────────────────────────────────────────────────────────────

create or replace view public.claim_list_view
with (security_invoker = true) as
select
  cl.id,
  cl.claim_number as "claimNumber",
  to_char(cl.created_at, 'YYYY-MM-DD') as date,
  cl.status,
  cl.type,
  cl.reason,
  cl.description,
  cl.quantity as "claimQuantity",
  o.id as "orderId",
  o.order_number as "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') as "orderDate",
  jsonb_build_object(
    'id', oi.item_id,
    'type', oi.item_type,
    'product', case
      when oi.item_type = 'product' then to_jsonb(p)
      else null
    end,
    'selectedOption', case
      when oi.item_type = 'product' and oi.selected_option_id is not null then (
        select option
        from jsonb_array_elements(
          coalesce(to_jsonb(p)->'options', '[]'::jsonb)
        ) option
        where option->>'id' = oi.selected_option_id
        limit 1
      )
      else null
    end,
    'quantity', oi.quantity,
    'reformData', case
      when oi.item_type = 'reform' then oi.reform_data
      else null
    end,
    'appliedCoupon', uc.user_coupon
  ) as item
from public.claims cl
join public.orders o
  on o.id = cl.order_id
 and o.user_id = auth.uid()
join public.order_items oi
  on oi.id = cl.order_item_id
left join lateral (
  select plv.*
  from public.product_list_view plv
  where oi.item_type = 'product'
    and oi.product_id is not null
    and plv.id = oi.product_id
  limit 1
) p
  on true
left join lateral (
  select
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
    ) as user_coupon
  from public.user_coupons uc1
  join public.coupons cp
    on cp.id = uc1.coupon_id
  where uc1.id = oi.applied_user_coupon_id
  limit 1
) uc
  on true
where cl.user_id = auth.uid();
