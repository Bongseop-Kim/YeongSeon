-- =============================================================
-- add_delivery_management
-- orders 테이블 배송 컬럼 추가, admin_settings 테이블 생성,
-- 뷰 변경/추가 (admin_order_list_view, admin_order_detail_view, order_detail_view)
-- =============================================================

-- 1. orders 테이블에 배송 컬럼 추가
alter table "public"."orders" add column "courier_company" text;
alter table "public"."orders" add column "tracking_number" text;
alter table "public"."orders" add column "shipped_at" timestamp with time zone;

-- 2. admin_settings 테이블 생성
create table "public"."admin_settings" (
  "key" text not null,
  "value" text,
  "updated_at" timestamp with time zone not null default now(),
  "updated_by" uuid
);

alter table "public"."admin_settings" enable row level security;

CREATE UNIQUE INDEX admin_settings_pkey ON public.admin_settings USING btree (key);
alter table "public"."admin_settings" add constraint "admin_settings_pkey" PRIMARY KEY using index "admin_settings_pkey";

alter table "public"."admin_settings" add constraint "admin_settings_updated_by_fkey"
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."admin_settings" validate constraint "admin_settings_updated_by_fkey";

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

create policy "Admins can view settings"
  on "public"."admin_settings" as permissive for select
  to authenticated using (public.is_admin());

create policy "Admins can insert settings"
  on "public"."admin_settings" as permissive for insert
  to authenticated with check (public.is_admin());

create policy "Admins can update settings"
  on "public"."admin_settings" as permissive for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on table "public"."admin_settings" to "authenticated";
grant all on table "public"."admin_settings" to "service_role";

-- 3. 뷰 drop & recreate (뷰 간 의존성 때문에 drop 필요)
drop view if exists "public"."admin_order_list_view";

-- admin_order_list_view: 택배/이메일 추가
create or replace view "public"."admin_order_list_view" as
SELECT
  o.id,
  o.user_id AS "userId",
  o.order_number AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
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
  public.admin_get_email(o.user_id) AS "customerEmail"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id;

-- admin_order_detail_view: 신규 (배송지 JOIN)
create or replace view "public"."admin_order_detail_view" as
SELECT
  o.id,
  o.user_id AS "userId",
  o.order_number AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
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
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id;

-- order_detail_view: 신규 (고객용 배송지+택배)
create or replace view "public"."order_detail_view" as
SELECT
  o.id,
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
FROM public.orders o
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
WHERE o.user_id = auth.uid();

-- 4. Privilege hardening: 업데이트 가능 컬럼 확장
REVOKE UPDATE ON TABLE public.orders FROM authenticated;
GRANT UPDATE (status, courier_company, tracking_number, shipped_at) ON TABLE public.orders TO authenticated;

-- 5. 초기 시드 데이터
INSERT INTO public.admin_settings (key, value)
VALUES ('default_courier_company', 'CJ대한통운')
ON CONFLICT (key) DO NOTHING;
