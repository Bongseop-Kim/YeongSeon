drop view if exists "public"."admin_claim_list_view";

drop view if exists "public"."admin_claim_status_log_view";

drop view if exists "public"."admin_order_detail_view";

drop view if exists "public"."admin_order_list_view";

drop view if exists "public"."admin_order_status_log_view";

drop view if exists "public"."admin_product_list_view";

drop view if exists "public"."admin_quote_request_detail_view";

drop view if exists "public"."admin_quote_request_list_view";

drop view if exists "public"."claim_list_view";

drop view if exists "public"."order_detail_view";

drop view if exists "public"."order_item_view";

drop view if exists "public"."order_list_view";

drop view if exists "public"."product_list_view";

drop view if exists "public"."quote_request_detail_view";

drop view if exists "public"."quote_request_list_view";

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
    pr.name AS "productName",
    cl.refund_data
   FROM ((((public.claims cl
     JOIN public.orders o ON ((o.id = cl.order_id)))
     JOIN public.order_items oi ON ((oi.id = cl.order_item_id)))
     LEFT JOIN public.products pr ON ((pr.id = oi.product_id)))
     LEFT JOIN public.profiles p ON ((p.id = cl.user_id)));


create or replace view "public"."admin_claim_status_log_view" as  SELECT l.id,
    l.claim_id AS "claimId",
    c.order_id AS "orderId",
    c.claim_number AS "claimNumber",
    c.type AS "claimType",
    l.changed_by AS "changedBy",
    l.previous_status AS "previousStatus",
    l.new_status AS "newStatus",
    l.memo,
    l.is_rollback AS "isRollback",
    l.created_at AS "createdAt"
   FROM (public.claim_status_logs l
     JOIN public.claims c ON ((c.id = l.claim_id)));


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
    o.company_courier_company AS "companyCourierCompany",
    o.company_tracking_number AS "companyTrackingNumber",
    o.company_shipped_at AS "companyShippedAt",
    o.created_at AS "createdAt",
    o.updated_at AS "updatedAt",
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
    ac.id AS "activeClaimId",
    ac.claim_number AS "activeClaimNumber",
    ac.type AS "activeClaimType",
    ac.status AS "activeClaimStatus",
    ac.quantity AS "activeClaimQuantity",
    o.payment_group_id AS "paymentGroupId",
    o.shipping_cost AS "shippingCost",
    public.get_order_admin_actions(o.order_type, o.status) AS "adminActions"
   FROM (((public.orders o
     LEFT JOIN public.profiles p ON ((p.id = o.user_id)))
     LEFT JOIN public.shipping_addresses sa ON ((sa.id = o.shipping_address_id)))
     LEFT JOIN LATERAL ( SELECT cl.id,
            cl.claim_number,
            cl.type,
            cl.status,
            cl.quantity
           FROM public.claims cl
          WHERE ((cl.order_id = o.id) AND (cl.status = ANY (ARRAY['접수'::text, '처리중'::text, '수거요청'::text, '수거완료'::text, '재발송'::text])))
          ORDER BY cl.created_at DESC, cl.id DESC
         LIMIT 1) ac ON (true));


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
    o.company_courier_company AS "companyCourierCompany",
    o.company_tracking_number AS "companyTrackingNumber",
    o.company_shipped_at AS "companyShippedAt",
    o.created_at AS "createdAt",
    o.updated_at AS "updatedAt",
    p.name AS "customerName",
    p.phone AS "customerPhone",
    public.admin_get_email(o.user_id) AS "customerEmail",
        CASE
            WHEN (o.order_type = 'custom'::text) THEN ((ri.item_data -> 'options'::text) ->> 'fabric_type'::text)
            ELSE NULL::text
        END AS "fabricType",
        CASE
            WHEN (o.order_type = 'custom'::text) THEN ((ri.item_data -> 'options'::text) ->> 'design_type'::text)
            ELSE NULL::text
        END AS "designType",
        CASE
            WHEN (o.order_type = ANY (ARRAY['custom'::text, 'repair'::text, 'sample'::text])) THEN ri.item_quantity
            ELSE NULL::integer
        END AS "itemQuantity",
        CASE
            WHEN (o.order_type = 'repair'::text) THEN (ri.item_quantity || '개 넥타이 수선'::text)
            ELSE NULL::text
        END AS "reformSummary",
    o.payment_group_id AS "paymentGroupId",
    o.shipping_cost AS "shippingCost",
        CASE
            WHEN (o.order_type = 'sample'::text) THEN true
            ELSE NULL::boolean
        END AS "isSample",
        CASE
            WHEN (o.order_type = 'sample'::text) THEN (ri.item_data ->> 'sample_type'::text)
            ELSE NULL::text
        END AS "sampleType"
   FROM ((public.orders o
     LEFT JOIN public.profiles p ON ((p.id = o.user_id)))
     LEFT JOIN LATERAL ( SELECT ( SELECT oi2.item_data
                   FROM public.order_items oi2
                  WHERE ((oi2.order_id = o.id) AND (oi2.item_type = ANY (ARRAY['reform'::text, 'custom'::text, 'sample'::text])))
                 LIMIT 1) AS item_data,
            (sum(oi.quantity))::integer AS item_quantity
           FROM public.order_items oi
          WHERE ((oi.order_id = o.id) AND (oi.item_type = ANY (ARRAY['reform'::text, 'custom'::text, 'sample'::text])))) ri ON ((o.order_type = ANY (ARRAY['custom'::text, 'repair'::text, 'sample'::text]))));


create or replace view "public"."admin_order_status_log_view" as  SELECT l.id,
    l.order_id AS "orderId",
    l.changed_by AS "changedBy",
    l.previous_status AS "previousStatus",
    l.new_status AS "newStatus",
    l.memo,
    l.is_rollback AS "isRollback",
    l.created_at AS "createdAt"
   FROM public.order_status_logs l;


create or replace view "public"."admin_product_list_view" as  SELECT p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.category,
    p.color,
    p.material,
    p.stock,
    p.created_at,
    p.updated_at,
    (count(po.id))::integer AS option_count,
        CASE
            WHEN (count(po.id) = 0) THEN NULL::integer
            WHEN bool_or((po.stock IS NULL)) THEN NULL::integer
            ELSE (sum(po.stock))::integer
        END AS option_stock_total
   FROM (public.products p
     LEFT JOIN public.product_options po ON ((po.product_id = p.id)))
  GROUP BY p.id, p.code, p.name, p.price, p.image, p.category, p.color, p.material, p.stock, p.created_at, p.updated_at;


create or replace view "public"."admin_quote_request_detail_view" as  SELECT qr.id,
    qr.user_id AS "userId",
    qr.quote_number AS "quoteNumber",
    to_char(qr.created_at, 'YYYY-MM-DD'::text) AS date,
    qr.status,
    qr.options,
    qr.quantity,
    qr.reference_images AS "referenceImages",
    qr.additional_notes AS "additionalNotes",
    qr.contact_name AS "contactName",
    qr.contact_title AS "contactTitle",
    qr.contact_method AS "contactMethod",
    qr.contact_value AS "contactValue",
    qr.quoted_amount AS "quotedAmount",
    qr.quote_conditions AS "quoteConditions",
    qr.admin_memo AS "adminMemo",
    qr.created_at AS "createdAt",
    qr.updated_at AS "updatedAt",
    p.name AS "customerName",
    p.phone AS "customerPhone",
    public.admin_get_email(qr.user_id) AS "customerEmail",
    sa.recipient_name AS "recipientName",
    sa.recipient_phone AS "recipientPhone",
    sa.address AS "shippingAddress",
    sa.address_detail AS "shippingAddressDetail",
    sa.postal_code AS "shippingPostalCode",
    sa.delivery_memo AS "deliveryMemo",
    sa.delivery_request AS "deliveryRequest"
   FROM ((public.quote_requests qr
     LEFT JOIN public.profiles p ON ((p.id = qr.user_id)))
     LEFT JOIN public.shipping_addresses sa ON ((sa.id = qr.shipping_address_id)));


create or replace view "public"."admin_quote_request_list_view" as  SELECT qr.id,
    qr.user_id AS "userId",
    qr.quote_number AS "quoteNumber",
    to_char(qr.created_at, 'YYYY-MM-DD'::text) AS date,
    qr.status,
    qr.quantity,
    qr.quoted_amount AS "quotedAmount",
    qr.contact_name AS "contactName",
    qr.contact_title AS "contactTitle",
    qr.contact_method AS "contactMethod",
    qr.contact_value AS "contactValue",
    qr.created_at AS "createdAt",
    qr.updated_at AS "updatedAt",
    p.name AS "customerName",
    p.phone AS "customerPhone",
    public.admin_get_email(qr.user_id) AS "customerEmail"
   FROM (public.quote_requests qr
     LEFT JOIN public.profiles p ON ((p.id = qr.user_id)));


create or replace view "public"."order_detail_view" as  SELECT o.id,
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.status,
    o.total_price AS "totalPrice",
    o.order_type AS "orderType",
    o.courier_company AS "courierCompany",
    o.tracking_number AS "trackingNumber",
    o.shipped_at AS "shippedAt",
    o.delivered_at AS "deliveredAt",
    o.company_courier_company AS "companyCourierCompany",
    o.company_tracking_number AS "companyTrackingNumber",
    o.company_shipped_at AS "companyShippedAt",
    o.confirmed_at AS "confirmedAt",
    o.created_at,
    sa.recipient_name AS "recipientName",
    sa.recipient_phone AS "recipientPhone",
    sa.address AS "shippingAddress",
    sa.address_detail AS "shippingAddressDetail",
    sa.postal_code AS "shippingPostalCode",
    sa.delivery_memo AS "deliveryMemo",
    sa.delivery_request AS "deliveryRequest",
    public.get_order_customer_actions(o.order_type, o.status, o.id) AS "customerActions"
   FROM (public.orders o
     LEFT JOIN public.shipping_addresses sa ON ((sa.id = o.shipping_address_id)))
  WHERE (o.user_id = auth.uid());


create or replace view "public"."order_list_view" as  SELECT o.id,
    o.order_number AS "orderNumber",
    to_char(o.created_at, 'YYYY-MM-DD'::text) AS date,
    o.status,
    o.total_price AS "totalPrice",
    o.order_type AS "orderType",
    o.created_at,
    public.get_order_customer_actions(o.order_type, o.status, o.id) AS "customerActions"
   FROM public.orders o
  WHERE ((o.user_id = auth.uid()) AND (EXISTS ( SELECT 1
           FROM public.order_items oi
          WHERE ((oi.order_id = o.id) AND (NOT (EXISTS ( SELECT 1
                   FROM public.claims cl
                  WHERE (cl.order_item_id = oi.id))))))));


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
    p.option_label AS "optionLabel",
    p.created_at,
    p.updated_at,
    COALESCE(jsonb_agg(jsonb_build_object('id', (po.id)::text, 'name', po.name, 'additionalPrice', po.additional_price, 'stock', po.stock) ORDER BY po.id) FILTER (WHERE (po.id IS NOT NULL)), '[]'::jsonb) AS options,
    COALESCE(lc.likes, 0) AS likes,
    COALESCE(public.product_is_liked_rpc(p.id), false) AS "isLiked"
   FROM ((public.products p
     LEFT JOIN public.product_options po ON ((po.product_id = p.id)))
     LEFT JOIN public.product_like_counts_rpc() lc(product_id, likes) ON ((lc.product_id = p.id)))
  GROUP BY p.id, p.code, p.name, p.price, p.image, p.detail_images, p.category, p.color, p.pattern, p.material, p.info, p.stock, p.option_label, p.created_at, p.updated_at, lc.likes;


create or replace view "public"."quote_request_detail_view" as  SELECT qr.id,
    qr.quote_number AS "quoteNumber",
    to_char(qr.created_at, 'YYYY-MM-DD'::text) AS date,
    qr.status,
    qr.options,
    qr.quantity,
    qr.reference_images AS "referenceImages",
    qr.additional_notes AS "additionalNotes",
    qr.contact_name AS "contactName",
    qr.contact_title AS "contactTitle",
    qr.contact_method AS "contactMethod",
    qr.contact_value AS "contactValue",
    qr.quoted_amount AS "quotedAmount",
    qr.quote_conditions AS "quoteConditions",
    qr.created_at
   FROM public.quote_requests qr
  WHERE (qr.user_id = auth.uid());


create or replace view "public"."quote_request_list_view" as  SELECT qr.id,
    qr.quote_number AS "quoteNumber",
    to_char(qr.created_at, 'YYYY-MM-DD'::text) AS date,
    qr.status,
    qr.quantity,
    qr.quoted_amount AS "quotedAmount",
    qr.contact_name AS "contactName",
    qr.contact_method AS "contactMethod",
    qr.created_at
   FROM public.quote_requests qr
  WHERE (qr.user_id = auth.uid());


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
            WHEN (oi.item_type = ANY (ARRAY['reform'::text, 'custom'::text, 'sample'::text])) THEN oi.item_data
            ELSE NULL::jsonb
        END, 'sampleData',
        CASE
            WHEN (oi.item_type = 'sample'::text) THEN oi.item_data
            ELSE NULL::jsonb
        END, 'appliedCoupon', uc.user_coupon) AS item,
    cl.refund_data
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
            WHEN (oi.item_type = ANY (ARRAY['reform'::text, 'custom'::text, 'sample'::text])) THEN oi.item_data
            ELSE NULL::jsonb
        END AS "reformData",
    uc.user_coupon AS "appliedCoupon",
        CASE
            WHEN (oi.item_type = 'sample'::text) THEN oi.item_data
            ELSE NULL::jsonb
        END AS "sampleData"
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
         LIMIT 1) uc ON (true))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM public.claims cl
          WHERE (cl.order_item_id = oi.id))));



