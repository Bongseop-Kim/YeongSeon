-- Admin RLS: privilege hardening
revoke update on table "public"."claims" from "authenticated";
grant update (status) on table "public"."claims" to "authenticated";

revoke update on table "public"."orders" from "authenticated";
grant update (status) on table "public"."orders" to "authenticated";

revoke update on table "public"."profiles" from "authenticated";
grant update (name, phone, birth) on table "public"."profiles" to "authenticated";
grant update (role, is_active) on table "public"."profiles" to "authenticated";

-- Admin Views

create or replace view "public"."admin_claim_list_view" with (security_invoker = true) as  SELECT cl.id,
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


create or replace view "public"."admin_order_item_view" with (security_invoker = true) as  SELECT oi.id,
    oi.order_id AS "orderId",
    oi.item_id AS "itemId",
    oi.item_type AS "itemType",
    oi.product_id AS "productId",
    oi.selected_option_id AS "selectedOptionId",
    oi.reform_data AS "reformData",
    oi.quantity,
    oi.unit_price AS "unitPrice",
    oi.discount_amount AS "discountAmount",
    oi.line_discount_amount AS "lineDiscountAmount",
    oi.applied_user_coupon_id AS "appliedUserCouponId",
    oi.created_at,
    pr.name AS "productName",
    pr.code AS "productCode",
    pr.image AS "productImage"
   FROM (public.order_items oi
     LEFT JOIN public.products pr ON ((pr.id = oi.product_id)));


create or replace view "public"."admin_order_list_view" with (security_invoker = true) as  SELECT o.id,
    o.user_id AS "userId",
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.status,
    o.total_price AS "totalPrice",
    o.original_price AS "originalPrice",
    o.total_discount AS "totalDiscount",
    o.created_at,
    o.updated_at,
    p.name AS "customerName",
    p.phone AS "customerPhone"
   FROM (public.orders o
     LEFT JOIN public.profiles p ON ((p.id = o.user_id)));

-- Admin RLS policies

create policy "Admins can update claim status"
  on "public"."claims" as permissive for update to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))))
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can view all claims"
  on "public"."claims" as permissive for select to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can delete coupons"
  on "public"."coupons" as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can insert coupons"
  on "public"."coupons" as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can update coupons"
  on "public"."coupons" as permissive for update to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))))
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can view all order items"
  on "public"."order_items" as permissive for select to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can update order status"
  on "public"."orders" as permissive for update to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))))
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can view all orders"
  on "public"."orders" as permissive for select to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can delete product options"
  on "public"."product_options" as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can insert product options"
  on "public"."product_options" as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can update product options"
  on "public"."product_options" as permissive for update to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))))
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can delete products"
  on "public"."products" as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can insert products"
  on "public"."products" as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can update products"
  on "public"."products" as permissive for update to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))))
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can update profiles"
  on "public"."profiles" as permissive for update to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))))
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can view all profiles"
  on "public"."profiles" as permissive for select to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can view all shipping addresses"
  on "public"."shipping_addresses" as permissive for select to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can insert user coupons"
  on "public"."user_coupons" as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can update user coupons"
  on "public"."user_coupons" as permissive for update to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))))
  with check ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));

create policy "Admins can view all user coupons"
  on "public"."user_coupons" as permissive for select to authenticated
  using ((EXISTS ( SELECT 1 FROM public.profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))))));
