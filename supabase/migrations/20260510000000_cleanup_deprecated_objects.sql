drop extension if exists "pg_cron";

drop trigger if exists "trg_order_image_expiry" on "public"."orders";

drop trigger if exists "update_token_purchases_updated_at" on "public"."token_purchases";

drop policy "Admins can view all generation logs" on "public"."ai_generation_logs_legacy";

drop policy "Users can view their own generation logs" on "public"."ai_generation_logs_legacy";

drop policy "Users can insert own images" on "public"."images";

drop policy "Users can view own images" on "public"."images";

drop policy "allow_public_read_pricing_constants" on "public"."pricing_constants";

revoke delete on table "public"."ai_generation_logs_legacy" from "anon";

revoke insert on table "public"."ai_generation_logs_legacy" from "anon";

revoke references on table "public"."ai_generation_logs_legacy" from "anon";

revoke select on table "public"."ai_generation_logs_legacy" from "anon";

revoke trigger on table "public"."ai_generation_logs_legacy" from "anon";

revoke truncate on table "public"."ai_generation_logs_legacy" from "anon";

revoke update on table "public"."ai_generation_logs_legacy" from "anon";

revoke delete on table "public"."ai_generation_logs_legacy" from "authenticated";

revoke insert on table "public"."ai_generation_logs_legacy" from "authenticated";

revoke references on table "public"."ai_generation_logs_legacy" from "authenticated";

revoke select on table "public"."ai_generation_logs_legacy" from "authenticated";

revoke trigger on table "public"."ai_generation_logs_legacy" from "authenticated";

revoke truncate on table "public"."ai_generation_logs_legacy" from "authenticated";

revoke update on table "public"."ai_generation_logs_legacy" from "authenticated";

revoke delete on table "public"."ai_generation_logs_legacy" from "service_role";

revoke insert on table "public"."ai_generation_logs_legacy" from "service_role";

revoke references on table "public"."ai_generation_logs_legacy" from "service_role";

revoke select on table "public"."ai_generation_logs_legacy" from "service_role";

revoke trigger on table "public"."ai_generation_logs_legacy" from "service_role";

revoke truncate on table "public"."ai_generation_logs_legacy" from "service_role";

revoke update on table "public"."ai_generation_logs_legacy" from "service_role";

revoke update on table "public"."claims" from "authenticated";

revoke update on table "public"."inquiries" from "authenticated";

revoke update on table "public"."orders" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke update on table "public"."quote_requests" from "authenticated";

alter table "public"."ai_generation_logs" drop constraint "ai_generation_logs_ai_model_check1";

alter table "public"."ai_generation_logs" drop constraint "ai_generation_logs_quality_check1";

alter table "public"."ai_generation_logs" drop constraint "ai_generation_logs_request_type_check1";

alter table "public"."ai_generation_logs" drop constraint "ai_generation_logs_user_id_fkey1";

alter table "public"."ai_generation_logs" drop constraint "ai_generation_logs_work_id_key1";

alter table "public"."ai_generation_logs_legacy" drop constraint "ai_generation_logs_ai_model_check";

alter table "public"."ai_generation_logs_legacy" drop constraint "ai_generation_logs_quality_check";

alter table "public"."ai_generation_logs_legacy" drop constraint "ai_generation_logs_request_type_check";

alter table "public"."ai_generation_logs_legacy" drop constraint "ai_generation_logs_user_id_fkey";

alter table "public"."ai_generation_logs_legacy" drop constraint "ai_generation_logs_work_id_key";

DO $$ BEGIN
  ALTER TABLE public.coupons DROP CONSTRAINT coupons_sample_discount_unique;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

drop function if exists "public"."admin_get_generation_logs"(p_start_date date, p_end_date date, p_ai_model text, p_limit integer, p_offset integer);

drop function if exists "public"."admin_get_generation_stats"(p_start_date date, p_end_date date);

drop function if exists "public"."cancel_stale_pending_orders"();

drop function if exists "public"."save_design_session"(p_session_id uuid, p_ai_model text, p_first_message text, p_last_image_url text, p_last_image_file_id text, p_messages jsonb);

drop function if exists "public"."set_generation_log_image_url"(p_work_id text, p_image_url text);

drop function if exists "public"."set_image_expiry_on_order_complete"();

drop function if exists "public"."use_design_tokens"(p_user_id uuid, p_ai_model text, p_request_type text, p_quality text, p_work_id text);

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

alter table "public"."ai_generation_logs" drop constraint "ai_generation_logs_pkey1";

alter table "public"."ai_generation_logs_legacy" drop constraint "ai_generation_logs_pkey";

drop index if exists "public"."ai_generation_logs_pkey1";

drop index if exists "public"."ai_generation_logs_work_id_key1";

drop index if exists "public"."coupons_sample_discount_unique";

drop index if exists "public"."ai_generation_logs_pkey";

drop index if exists "public"."ai_generation_logs_work_id_key";

drop index if exists "public"."idx_ai_gen_logs_created";

drop index if exists "public"."idx_ai_gen_logs_model";

drop index if exists "public"."idx_ai_gen_logs_user";

drop table "public"."ai_generation_logs_legacy";

CREATE UNIQUE INDEX ai_generation_logs_pkey ON public.ai_generation_logs USING btree (id);

CREATE UNIQUE INDEX ai_generation_logs_work_id_key ON public.ai_generation_logs USING btree (work_id);

CREATE INDEX idx_ai_gen_logs_created ON public.ai_generation_logs USING btree (created_at DESC);

CREATE INDEX idx_ai_gen_logs_model ON public.ai_generation_logs USING btree (ai_model, created_at DESC);

CREATE INDEX idx_ai_gen_logs_user ON public.ai_generation_logs USING btree (user_id, created_at DESC);

alter table "public"."ai_generation_logs" add constraint "ai_generation_logs_pkey" PRIMARY KEY using index "ai_generation_logs_pkey";

alter table "public"."ai_generation_logs" add constraint "ai_generation_logs_ai_model_check" CHECK ((ai_model = ANY (ARRAY['openai'::text, 'gemini'::text, 'fal'::text]))) not valid;

alter table "public"."ai_generation_logs" validate constraint "ai_generation_logs_ai_model_check";

alter table "public"."ai_generation_logs" add constraint "ai_generation_logs_quality_check" CHECK ((quality = ANY (ARRAY['standard'::text, 'high'::text]))) not valid;

alter table "public"."ai_generation_logs" validate constraint "ai_generation_logs_quality_check";

alter table "public"."ai_generation_logs" add constraint "ai_generation_logs_request_type_check" CHECK ((request_type = ANY (ARRAY['analysis'::text, 'render_standard'::text, 'render_high'::text]))) not valid;

alter table "public"."ai_generation_logs" validate constraint "ai_generation_logs_request_type_check";

alter table "public"."ai_generation_logs" add constraint "ai_generation_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."ai_generation_logs" validate constraint "ai_generation_logs_user_id_fkey";

alter table "public"."ai_generation_logs" add constraint "ai_generation_logs_work_id_key" UNIQUE using index "ai_generation_logs_work_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.use_design_tokens(p_user_id uuid, p_ai_model text, p_request_type text, p_work_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cost_key       text;
  v_cost           integer;
  v_total_bal      integer;
  v_paid_bal       integer;
  v_bonus_bal      integer;
  v_caller_role    text;
  v_paid_deduct    integer;
  v_bonus_deduct   integer;
  v_remaining_paid integer;
  v_batch_consume  integer;
  v_batch_idx      integer;
  v_batch_row      RECORD;
BEGIN
  -- 소유권 검증: service_role이 아닌 경우 auth.uid() 일치 확인
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  -- 파라미터 화이트리스트 검증
  IF p_ai_model NOT IN ('openai', 'gemini', 'fal') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('analysis', 'render_standard', 'render_high') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;

  -- 동시 요청 advisory lock (사용자별)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- 비용 조회
  v_cost_key := 'design_token_cost_' || p_ai_model || '_' || p_request_type;

  SELECT value::integer INTO v_cost FROM public.admin_settings WHERE key = v_cost_key;
  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'cost not configured for key: %', v_cost_key;
  END IF;

  -- pending 환불 체크
  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE user_id = p_user_id
      AND type = 'token_refund' AND status = '접수'
  ) THEN
    SELECT COALESCE(SUM(amount) FILTER (WHERE expires_at IS NULL OR expires_at > now()), 0)::integer
      INTO v_total_bal FROM public.design_tokens WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', false, 'error', 'refund_pending', 'balance', v_total_bal, 'cost', v_cost
    );
  END IF;

  -- paid 잔량: 만료되지 않은 paid 토큰 전체(만료 없음 포함)
  SELECT COALESCE(SUM(amount), 0)::integer INTO v_paid_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id
    AND token_class = 'paid'
    AND (expires_at IS NULL OR expires_at > now());

  SELECT COALESCE(SUM(amount), 0)::integer INTO v_bonus_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class IN ('bonus', 'free');
  v_total_bal := v_paid_bal + v_bonus_bal;

  -- 구 포맷(_use_paid) + 신 포맷(_use_paid_0, _use_paid_legacy) 모두 인식
  IF p_work_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.design_tokens
    WHERE user_id = p_user_id
      AND work_id IN (
        p_work_id || '_use_paid',
        p_work_id || '_use_paid_0',
        p_work_id || '_use_paid_legacy',
        p_work_id || '_use_bonus'
      )
  ) THEN
    RETURN jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal);
  END IF;

  -- 잔액 부족
  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'insufficient_tokens', 'balance', v_total_bal, 'cost', v_cost
    );
  END IF;

  -- paid/bonus 차감량 분배
  v_paid_deduct  := LEAST(v_cost, v_paid_bal);
  v_bonus_deduct := v_cost - v_paid_deduct;

  IF v_paid_deduct > 0 THEN
    v_remaining_paid := v_paid_deduct;
    v_batch_idx := 0;

    FOR v_batch_row IN
      SELECT source_order_id, expires_at, SUM(amount)::integer AS remaining
      FROM public.design_tokens
      WHERE user_id = p_user_id
        AND token_class = 'paid'
        AND source_order_id IS NOT NULL
        AND expires_at > now()
      GROUP BY source_order_id, expires_at
      HAVING SUM(amount) > 0
      ORDER BY expires_at ASC
    LOOP
      EXIT WHEN v_remaining_paid <= 0;

      v_batch_consume := LEAST(v_remaining_paid, v_batch_row.remaining);

      INSERT INTO public.design_tokens (
        user_id, amount, type, token_class,
        source_order_id, expires_at,
        ai_model, request_type, description, work_id
      ) VALUES (
        p_user_id, -v_batch_consume, 'use', 'paid',
        v_batch_row.source_order_id, v_batch_row.expires_at,
        p_ai_model, p_request_type,
        'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료',
        CASE WHEN p_work_id IS NOT NULL
          THEN p_work_id || '_use_paid_' || v_batch_idx
          ELSE NULL END
      )
      ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;

      v_remaining_paid := v_remaining_paid - v_batch_consume;
      v_batch_idx := v_batch_idx + 1;
    END LOOP;

    IF v_remaining_paid > 0 THEN
      INSERT INTO public.design_tokens (
        user_id, amount, type, token_class,
        source_order_id, expires_at,
        ai_model, request_type, description, work_id
      ) VALUES (
        p_user_id, -v_remaining_paid, 'use', 'paid',
        NULL, NULL,
        p_ai_model, p_request_type,
        'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료 (레거시)',
        CASE WHEN p_work_id IS NOT NULL
          THEN p_work_id || '_use_paid_legacy'
          ELSE NULL END
      )
      ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;

  IF v_bonus_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) VALUES (
      p_user_id, -v_bonus_deduct, 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 보너스',
      CASE WHEN p_work_id IS NOT NULL THEN p_work_id || '_use_bonus' ELSE NULL END
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal - v_cost);
END;
$function$
;

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


CREATE OR REPLACE FUNCTION public.admin_get_period_stats(p_order_type text, p_start_date date, p_end_date date)
 RETURNS TABLE(period_order_count bigint, period_revenue numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_start_date is null then
    raise exception 'p_start_date is required';
  end if;

  if p_end_date is null then
    raise exception 'p_end_date is required';
  end if;

  if p_start_date > p_end_date then
    raise exception 'p_start_date must be <= p_end_date';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair', 'token', 'sample') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint                        AS period_order_count,
    COALESCE(SUM(total_price), 0)::numeric  AS period_revenue
  FROM public.orders
  WHERE created_at >= p_start_date
    AND created_at <  p_end_date + 1
    AND (
      p_order_type = 'all'
      OR order_type = p_order_type
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_today_stats(p_order_type text, p_date text)
 RETURNS TABLE(today_order_count bigint, today_revenue numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_date is null or p_date = '' then
    raise exception 'p_date is required';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair', 'token', 'sample') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS today_order_count,
    COALESCE(SUM("totalPrice"), 0)::numeric AS today_revenue
  FROM public.admin_order_list_view
  WHERE date = p_date
    AND (
      p_order_type = 'all'
      OR "orderType" = p_order_type
    );
end;
$function$
;

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


CREATE OR REPLACE FUNCTION public.admin_update_claim_status(p_claim_id uuid, p_new_status text, p_memo text DEFAULT NULL::text, p_is_rollback boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_current_status text;
  v_claim_type text;
  v_order_id uuid;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status + claim type + order id
  select c.status, c.type, c.order_id
  into v_current_status, v_claim_type, v_order_id
  from public.claims c
  where c.id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if v_current_status not in ('접수', '처리중', '수거요청', '수거완료', '재발송')
     and p_new_status in ('접수', '처리중', '수거요청', '수거완료', '재발송') then
    perform 1
    from public.orders
    where id = v_order_id
    for update;

    if not found then
      raise exception 'Order not found';
    end if;

    perform 1
    from public.claims
    where order_id = v_order_id
      and id <> p_claim_id
      and status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
    for update;

    if found then
      raise exception 'Active claim already exists for this order';
    end if;
  end if;

  if p_is_rollback then
    -- Rollback requires memo
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
    end if;

    -- Validate rollback transition by claim type
    -- Special: 거부 → 접수 allowed for all types (오거부 복원)
    if v_current_status = '거부' and p_new_status = '접수' then
      -- allowed for all claim types
      null;
    elsif v_claim_type = 'cancel' then
      if not (v_current_status = '처리중' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for cancel claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'return' then
      if not (v_current_status = '수거요청' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for return claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'exchange' then
      if not (v_current_status = '수거요청' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for exchange claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'token_refund' then
      -- token_refund 롤백: 거부→접수는 공통 로직(위)에서 허용, 나머지 롤백 불가
      raise exception 'Invalid rollback from "%" to "%" for token_refund claim', v_current_status, p_new_status;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  else
    -- Validate forward state transition by claim type
    if v_claim_type = 'cancel' then
      if not (
        (v_current_status = '접수' and p_new_status = '처리중')
        or (v_current_status = '처리중' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '처리중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for cancel claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'return' then
      if not (
        (v_current_status = '접수' and p_new_status = '수거요청')
        or (v_current_status = '수거요청' and p_new_status = '수거완료')
        or (v_current_status = '수거완료' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for return claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'exchange' then
      if not (
        (v_current_status = '접수' and p_new_status = '수거요청')
        or (v_current_status = '수거요청' and p_new_status = '수거완료')
        or (v_current_status = '수거완료' and p_new_status = '재발송')
        or (v_current_status = '재발송' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료', '재발송'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for exchange claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'token_refund' then
      -- token_refund 완료 처리는 approve_token_refund() 전용 (Edge Function 경유 필수)
      -- 이 RPC에서 완료를 허용하면 design_tokens/orders 부수효과가 누락된다.
      if not (
        (v_current_status = '접수' and p_new_status = '거부')
      ) then
        raise exception 'Invalid transition from "%" to "%" for token_refund claim', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  end if;

  -- Update claim status
  update public.claims
  set status = p_new_status
  where id = p_claim_id;

  -- Insert status log
  insert into public.claim_status_logs (
    claim_id,
    changed_by,
    previous_status,
    new_status,
    memo,
    is_rollback
  )
  values (
    p_claim_id,
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

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid, p_new_status text, p_memo text DEFAULT NULL::text, p_payment_key text DEFAULT NULL::text, p_is_rollback boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid := auth.uid();
  v_current_status text;
  v_order_type text;
  v_payment_key text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select status, order_type, payment_key
  into v_current_status, v_order_type, v_payment_key
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
      if not (
        (v_current_status = '접수' and p_new_status = '발송중')
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
        or (v_current_status = '접수' and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '발송대기', '발송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      -- token 완료는 confirm_payment 흐름에서만 처리. 관리자 수동 완료 불가.
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
$function$
;

CREATE OR REPLACE FUNCTION public.approve_token_refund(p_request_id uuid, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role       text;
  v_req               record;
  v_paid_token_amount integer;
  v_order_status      text;
  v_source_order_id   uuid;
  v_purchase_expires_at timestamptz;
BEGIN
  -- service_role 전용
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: approve_token_refund requires service_role';
  END IF;

  SELECT c.id, c.user_id, c.order_id,
         (c.refund_data->>'paid_token_amount')::int AS paid_token_amount,
         (c.refund_data->>'bonus_token_amount')::int AS bonus_token_amount,
         c.status
    INTO v_req
    FROM public.claims c
   WHERE c.id = p_request_id
     AND c.type = 'token_refund'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_req.user_id::text));

  SELECT dt.source_order_id, dt.expires_at
    INTO v_source_order_id, v_purchase_expires_at
    FROM public.design_tokens dt
   WHERE dt.user_id = v_req.user_id
     AND dt.type = 'purchase'
     AND (
       dt.source_order_id = v_req.order_id
       OR dt.work_id = 'order_' || v_req.order_id::text
       OR dt.work_id = 'order_' || v_req.order_id::text || '_paid'
     )
   ORDER BY dt.created_at DESC
   LIMIT 1;

  v_source_order_id := COALESCE(v_source_order_id, v_req.order_id);

  -- 이미 완료된 경우 멱등하게 성공 반환
  IF v_req.status = '완료' THEN
    RETURN;
  END IF;

  -- 접수 상태만 허용 (처리중 중간 상태 없음)
  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'refund request is not in processable state (status: %)', v_req.status;
  END IF;

  v_paid_token_amount := v_req.paid_token_amount;

  SELECT o.status INTO v_order_status
    FROM public.orders o
   WHERE o.id = v_req.order_id
     FOR UPDATE;

  -- 유료 토큰 회수
  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class,
    source_order_id, expires_at,
    description, work_id
  ) VALUES (
    v_req.user_id, -v_paid_token_amount, 'refund', 'paid',
    v_source_order_id, v_purchase_expires_at,
    '토큰 환불 승인 (유료)',
    'refund_' || p_request_id::text || '_paid'
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;

  IF v_req.bonus_token_amount > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, description, work_id
    ) VALUES (
      v_req.user_id, -v_req.bonus_token_amount, 'refund', 'bonus',
      '토큰 환불 승인 (보너스)',
      'refund_' || p_request_id::text || '_bonus'
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  -- 주문 취소 처리 (전액 환불이므로 항상 취소)
  UPDATE public.orders
     SET status = '취소', updated_at = now()
   WHERE id = v_req.order_id;

  INSERT INTO public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) VALUES (
    v_req.order_id, p_admin_id, v_order_status, '취소',
    '토큰 환불 승인 (request_id: ' || p_request_id::text || ')'
  );

  -- claim_status_logs 기록 (상태 전이 감사 추적)
  INSERT INTO public.claim_status_logs (
    claim_id, changed_by, previous_status, new_status, memo, is_rollback
  ) VALUES (
    p_request_id, p_admin_id, '접수', '완료', '토큰 환불 승인', false
  );

  -- 환불 요청 상태 업데이트
  UPDATE public.claims
     SET status     = '완료',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_confirm_delivered_orders()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order  record;
  v_count  integer := 0;
begin
  -- pg_cron 또는 service_role 호출만 허용
  -- ''는 pg_cron 전용: pg_cron은 JWT 없이 DB 레벨에서 실행되므로 role claim이 NULL → ''로 평가됨
  -- HTTP를 통한 외부 호출은 반드시 JWT를 포함하므로 ''로 도달할 수 없음
  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'unauthorized: scheduler-only function';
  end if;

  for v_order in
    select id, user_id, total_price, status
    from public.orders
    where (
      (status = '배송완료' and delivered_at <= now() - interval '7 days')
      or
      (
        status = '배송중'
        and (
          (order_type = 'repair' and company_shipped_at <= now() - interval '7 days')
          or
          (order_type <> 'repair' and shipped_at <= now() - interval '7 days')
        )
      )
    )
    and not exists (
      select 1
      from public.claims c
      join public.order_items oi on oi.id = c.order_item_id
      where oi.order_id = orders.id
        and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
    )
    for update skip locked
  loop
    update public.orders
    set status       = '완료',
        confirmed_at = now()
    where id = v_order.id;

    -- Audit log (changed_by = NULL indicates automated system action)
    insert into public.order_status_logs (
      order_id,
      changed_by,
      previous_status,
      new_status,
      memo
    )
    values (
      v_order.id,
      NULL,
      v_order.status,
      '완료',
      format('자동 구매확정 (%s 후 7일 경과)', v_order.status)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'confirmed_count', v_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_custom_order_amounts(p_options jsonb, p_quantity integer, p_sample boolean DEFAULT NULL::boolean, p_sample_type text DEFAULT NULL::text)
 RETURNS TABLE(sewing_cost integer, fabric_cost integer, total_cost integer)
 LANGUAGE plpgsql
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

  v_sewing_per_unit integer;
  v_unit_fabric_cost integer;
  v_fabric_amount integer;
begin
  if p_sample is not null or p_sample_type is not null then
    raise exception 'Legacy sample parameters (p_sample, p_sample_type) are no longer supported. Use create_sample_order_txn instead.';
  end if;

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
  from public.pricing_constants
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

  -- tie_type/interlining 유효값 검증: 미지 값은 조용히 기본처리되지 않고 예외 발생
  if v_tie_type != '' and v_tie_type != 'AUTO' then
    raise exception 'Invalid tie_type: %. Allowed values are empty string or AUTO', v_tie_type;
  end if;
  if v_interlining != '' and v_interlining != 'WOOL' then
    raise exception 'Invalid interlining: %. Allowed values are empty string or WOOL', v_interlining;
  end if;

  v_triangle_stitch := coalesce((p_options->>'triangle_stitch')::boolean, false);
  v_side_stitch := coalesce((p_options->>'side_stitch')::boolean, false);
  v_bar_tack := coalesce((p_options->>'bar_tack')::boolean, false);
  v_dimple := coalesce((p_options->>'dimple')::boolean, false);
  v_spoderato := coalesce((p_options->>'spoderato')::boolean, false);
  v_fold7 := coalesce((p_options->>'fold7')::boolean, false);
  v_brand_label := coalesce((p_options->>'brand_label')::boolean, false);
  v_care_label := coalesce((p_options->>'care_label')::boolean, false);

  if v_dimple and v_tie_type != 'AUTO' then
    raise exception '딤플은 자동 봉제(AUTO)에서만 선택 가능합니다';
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
    -- fabric_provided=false인데 design_type/fabric_type이 누락된 경우는 데이터 오류
    raise exception 'fabric_provided=false이지만 design_type 또는 fabric_type이 null입니다';
  else
    select pc.amount
    into v_unit_fabric_cost
    from public.pricing_constants pc
    where pc.key = 'FABRIC_' || v_design_type || '_' || v_fabric_type;

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

CREATE OR REPLACE FUNCTION public.cancel_token_refund(p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_req     record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  SELECT c.id, c.user_id, c.status
    INTO v_req
    FROM public.claims c
   WHERE c.id = p_request_id
     AND c.type = 'token_refund'
     AND c.user_id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  IF v_req.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden: refund request not owned by user';
  END IF;

  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'only pending requests can be cancelled (status: %)', v_req.status;
  END IF;

  UPDATE public.claims
     SET status = '거부',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_payment_orders(p_payment_group_id uuid, p_user_id uuid, p_payment_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if p_payment_key is null or trim(p_payment_key) = '' then
    raise exception 'payment_key is required';
  end if;

  v_caller_role := auth.role();

  -- service_role만 auth.uid() = null 상태로 우회 가능
  if auth.uid() is null then
    if v_caller_role is distinct from 'service_role' then
      raise exception 'Forbidden';
    end if;
  elsif p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  -- payment_key 마스킹: 끝 8자리만 유지, 나머지 ****
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

    -- IS DISTINCT FROM: p_user_id가 NULL이어도 안전하게 비교
    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status != '결제중' then
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    -- repair → 발송대기 (기존: else '접수')
    v_post_status := case v_order.order_type
      when 'sale'   then '진행중'
      when 'token'  then '완료'
      when 'sample' then '접수'
      when 'repair' then '발송대기'
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

    -- token 주문: 토큰 지급
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

      -- 토큰 지급: source_order_id + expires_at 설정 (만료: 구매 시점 + 1년)
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
      -- order_items에서 sample_type, design_type 추출
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

      -- ⚠️ 샘플 할인값의 원본은 pricing_constants이며,
      -- coupons 테이블의 SAMPLE_DISCOUNT_* row는 이 값을 기반으로 자동 동기화됩니다.
      -- 쿠폰 관리 페이지에서 직접 수정하지 마세요.
      select pc.amount into v_discount_amount
      from public.pricing_constants pc
      where pc.key = v_pricing_key;

      if v_discount_amount is null then
        raise exception 'Sample discount pricing key % is not configured; coupons_name_unique upsert cannot continue', v_pricing_key;
      end if;

      -- coupons row 동기화 (user_coupons FK용)
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

  -- 결제 확정 후 예약된 쿠폰을 사용 처리
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_claim(p_type text, p_order_id uuid, p_item_id text, p_reason text, p_description text DEFAULT NULL::text, p_quantity integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_order_type text;
  v_order_status text;
  v_order_item record;
  v_claim_quantity integer;
  v_claim_number text;
  v_claim_id uuid;
  v_constraint_name text;
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

  -- 4. Order ownership check (FOR UPDATE: 처리 중 동시 상태 변경 방지)
  select o.order_type, o.status
  into v_order_type, v_order_status
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- 5. 상태 가드: cancel (BR-claim-002, BR-claim-003, BR-claim-004)
  if p_type = 'cancel' then
    if not (
      (v_order_type = 'sale'   and v_order_status in ('대기중', '결제중', '진행중'))
      or (v_order_type = 'custom' and v_order_status in ('대기중', '결제중', '접수'))
      or (v_order_type = 'repair' and v_order_status in ('대기중', '결제중'))
      or (v_order_type = 'sample' and v_order_status in ('대기중', '결제중', '접수'))
      or (v_order_type = 'token' and v_order_status in ('대기중'))
    ) then
      raise exception '현재 주문 상태에서는 취소할 수 없습니다';
    end if;
  end if;

  -- 6. 상태 가드: return/exchange (BR-claim-007: 배송중/배송완료에서만 허용)
  if p_type in ('return', 'exchange') then
    if not (
      v_order_status in ('배송중', '배송완료')
      and v_order_type in ('sale', 'repair', 'custom')
    ) then
      raise exception '현재 주문 상태에서는 반품/교환할 수 없습니다';
    end if;
  end if;

  -- 7. Order item lookup (p_item_id is order_items.item_id text)
  begin
    select oi.id, oi.quantity
    into strict v_order_item
    from public.order_items oi
    where oi.item_id = p_item_id
      and oi.order_id = p_order_id;
  exception
    when no_data_found then
      raise exception 'Order item not found';
    when too_many_rows then
      raise exception 'Multiple order items found for given order_id and item_id';
  end;

  -- 8. Quantity validation
  v_claim_quantity := coalesce(p_quantity, v_order_item.quantity);
  if v_claim_quantity <= 0 or v_claim_quantity > v_order_item.quantity then
    raise exception 'Invalid claim quantity';
  end if;

  -- 9. Generate claim number
  v_claim_number := public.generate_claim_number();

  -- 10. 주문 단위 활성 클레임 가드
  --     최종 진실 소스는 partial unique index(idx_claims_single_active_per_order)이며,
  --     이 가드는 사용자 친화적인 오류 메시지를 위한 보조 장치다.
  if exists (
    select 1
    from public.claims c
    where c.order_id = p_order_id
      and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception 'Active claim already exists for this order';
  end if;

  -- 11. Insert claim
  --     중복 감지는 partial unique index(idx_claims_active_per_item)와
  --     ON CONFLICT ... DO NOTHING + v_claim_id IS NULL 체크로 원자적으로 처리한다.
  begin
    insert into public.claims (
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
    on conflict (order_item_id, type) where (status in ('접수', '처리중', '수거요청', '수거완료', '재발송', '완료'))
    do nothing
    returning id into v_claim_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if v_constraint_name = 'idx_claims_single_active_per_order' then
        raise exception 'Active claim already exists for this order';
      end if;

      raise;
  end;

  if v_claim_id is null then
    raise exception 'Claim already exists for this item and type';
  end if;

  return jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_number', v_claim_number
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

        -- Check option stock
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

  -- repair 주문 생성 (shipping_cost=v_reform_shipping_cost)
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

      -- reform 이미지 라이프사이클 추적: tie 이미지를 images 테이블에 등록
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

  -- 쿠폰을 즉시 'used'로 마킹하지 않고 'reserved'로 예약.
  -- 결제 확정(confirm_payment_orders) 시 'used'로 전환,
  -- 결제 실패(unlock_payment_orders) 시 'active'로 복원.
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_quote_request_txn(p_shipping_address_id uuid, p_options jsonb, p_quantity integer, p_reference_images jsonb DEFAULT '[]'::jsonb, p_additional_notes text DEFAULT ''::text, p_contact_name text DEFAULT ''::text, p_contact_title text DEFAULT ''::text, p_contact_method text DEFAULT 'phone'::text, p_contact_value text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_quote_id uuid;
  v_quote_number text;
  v_elem jsonb;
  v_idx integer;
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

  if p_reference_images is not null and jsonb_typeof(p_reference_images) <> 'array' then
    raise exception 'p_reference_images must be a JSON array';
  end if;

  v_idx := 0;
  if p_reference_images is not null then
    for v_elem in select jsonb_array_elements(p_reference_images) loop
      if jsonb_typeof(v_elem) <> 'object'
         or not (v_elem ? 'url')
         or jsonb_typeof(v_elem->'url') <> 'string'
         or btrim(coalesce(v_elem->>'url', '')) = ''
         or ((v_elem ? 'file_id') and jsonb_typeof(v_elem->'file_id') not in ('string', 'null')) then
        raise exception 'p_reference_images[%] must be an object with a non-empty string "url" and optional string/null "file_id"', v_idx;
      end if;
      v_idx := v_idx + 1;
    end loop;
  end if;

  v_quote_number := public.generate_quote_number();

  insert into public.quote_requests (
    user_id,
    quote_number,
    shipping_address_id,
    options,
    quantity,
    reference_images,
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
    coalesce(p_reference_images, '[]'::jsonb),
    coalesce(p_additional_notes, ''),
    trim(p_contact_name),
    coalesce(trim(p_contact_title), ''),
    p_contact_method,
    trim(p_contact_value),
    '요청'
  )
  returning id into v_quote_id;

  -- images 테이블에 참조 이미지 등록
  -- SECURITY DEFINER이므로 RLS bypass. RPC 내부에서 이미 v_user_id := auth.uid() 소유권 검증 완료.
  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/custom-orders',
      'quote_request',
      v_quote_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  return jsonb_build_object(
    'quote_request_id', v_quote_id,
    'quote_number', v_quote_number
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_sample_order_txn(p_shipping_address_id uuid, p_sample_type text, p_options jsonb, p_reference_images jsonb DEFAULT '[]'::jsonb, p_additional_notes text DEFAULT ''::text, p_user_coupon_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_payment_group_id uuid;
  v_total_cost integer;
  v_item_data jsonb;
  v_design_type text;
  v_elem jsonb;
  v_idx integer;

  -- 쿠폰 관련 변수
  v_coupon record;
  v_discount_amount integer := 0;
  v_line_discount_total integer := 0;
  v_total_price integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_sample_type not in ('fabric', 'sewing', 'fabric_and_sewing') then
    raise exception 'Invalid p_sample_type: %', p_sample_type;
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if p_reference_images is not null and jsonb_typeof(p_reference_images) <> 'array' then
    raise exception 'p_reference_images must be a JSON array';
  end if;

  v_idx := 0;
  if p_reference_images is not null then
    for v_elem in select jsonb_array_elements(p_reference_images) loop
      if jsonb_typeof(v_elem) <> 'object'
         or not (v_elem ? 'url')
         or jsonb_typeof(v_elem->'url') <> 'string'
         or btrim(coalesce(v_elem->>'url', '')) = ''
         or ((v_elem ? 'file_id') and jsonb_typeof(v_elem->'file_id') not in ('string', 'null')) then
        raise exception 'p_reference_images[%] must be an object with a non-empty string "url" and optional string/null "file_id"', v_idx;
      end if;
      v_idx := v_idx + 1;
    end loop;
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  v_design_type := p_options->>'design_type';

  if p_sample_type in ('fabric', 'fabric_and_sewing')
     and v_design_type not in ('PRINTING', 'YARN_DYED') then
    raise exception 'Invalid design_type for sample order: %', v_design_type;
  end if;

  select pc.amount
  into v_total_cost
  from public.pricing_constants pc
  where pc.key = case p_sample_type
    when 'sewing' then 'SAMPLE_SEWING_COST'
    when 'fabric' then
      case v_design_type
        when 'PRINTING' then 'SAMPLE_FABRIC_PRINTING_COST'
        else                 'SAMPLE_FABRIC_YARN_DYED_COST'
      end
    else -- fabric_and_sewing
      case v_design_type
        when 'PRINTING' then 'SAMPLE_FABRIC_AND_SEWING_PRINTING_COST'
        else                 'SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST'
      end
  end;

  if v_total_cost is null then
    raise exception 'Sample pricing constant is not configured';
  end if;

  -- 쿠폰 검증 및 할인 계산 (unit_price = v_total_cost, qty = 1)
  if p_user_coupon_id is not null then
    select
      uc.id, uc.status, uc.expires_at,
      c.discount_type, c.discount_value, c.max_discount_amount,
      c.expiry_date, c.is_active
    into v_coupon
    from public.user_coupons uc
    join public.coupons c on c.id = uc.coupon_id
    where uc.id = p_user_coupon_id
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

    -- qty=1이므로 라인 할인 = 단위 할인
    if v_coupon.discount_type = 'percentage' then
      v_discount_amount := floor(v_total_cost * (v_coupon.discount_value::numeric / 100.0))::integer;
    elsif v_coupon.discount_type = 'fixed' then
      v_discount_amount := floor(v_coupon.discount_value::numeric)::integer;
    else
      raise exception 'Invalid coupon type';
    end if;

    v_discount_amount := greatest(0, least(v_discount_amount, v_total_cost));
    v_line_discount_total := v_discount_amount;
    if v_coupon.max_discount_amount is not null then
      v_line_discount_total := least(v_line_discount_total, v_coupon.max_discount_amount);
    end if;
  end if;

  v_total_price := v_total_cost - v_line_discount_total;

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
    v_total_price,
    v_total_cost,
    v_line_discount_total,
    'sample',
    '대기중',
    v_payment_group_id
  )
  returning id into v_order_id;

  v_item_data := jsonb_build_object(
    'sample_type', p_sample_type,
    'options', coalesce(p_options, '{}'::jsonb),
    'reference_images', coalesce(p_reference_images, '[]'::jsonb),
    'additional_notes', coalesce(p_additional_notes, ''),
    'pricing', jsonb_build_object(
      'total_cost', v_total_cost
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
    'sample-order-' || v_order_id::text,
    'sample',
    null,
    null,
    v_item_data,
    1,
    v_total_cost,
    v_line_discount_total,
    v_line_discount_total,
    p_user_coupon_id
  );

  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/sample-orders',
      'sample_order',
      v_order_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  -- 쿠폰 reserved 처리
  if p_user_coupon_id is not null then
    update public.user_coupons
    set status = 'reserved',
        updated_at = now()
    where id = p_user_coupon_id
      and user_id = v_user_id
      and status = 'active';
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_token_order(p_plan_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id          uuid;
  v_price_key        text;
  v_amount_key       text;
  v_price            integer;
  v_token_amount     integer;
  v_payment_group_id uuid;
  v_order_number     text;
  v_order_id         uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 플랜 화이트리스트 검증
  IF p_plan_key NOT IN ('starter', 'popular', 'pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key;
  END IF;

  -- pricing_constants에서 가격/수량 조회
  v_price_key  := 'token_plan_' || p_plan_key || '_price';
  v_amount_key := 'token_plan_' || p_plan_key || '_amount';

  SELECT amount INTO v_price
    FROM public.pricing_constants WHERE key = v_price_key;
  SELECT amount INTO v_token_amount
    FROM public.pricing_constants WHERE key = v_amount_key;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'price not configured for plan: %', p_plan_key;
  END IF;
  IF v_token_amount IS NULL OR v_token_amount <= 0 THEN
    RAISE EXCEPTION 'token_amount not configured for plan: %', p_plan_key;
  END IF;

  v_payment_group_id := gen_random_uuid();
  v_order_number     := public.generate_token_order_number();
  v_order_id         := gen_random_uuid();

  INSERT INTO public.orders (
    id, user_id, order_number, shipping_address_id,
    total_price, original_price, total_discount,
    order_type, status, payment_group_id, shipping_cost
  ) VALUES (
    v_order_id, v_user_id, v_order_number, NULL,
    v_price, v_price, 0,
    'token', '대기중', v_payment_group_id, 0
  );

  INSERT INTO public.order_items (
    order_id, item_id, item_type, item_data, quantity, unit_price
  ) VALUES (
    v_order_id, p_plan_key, 'token',
    jsonb_build_object(
      'plan_key',     p_plan_key,
      'token_amount', v_token_amount
    ),
    1, v_price
  );

  RETURN jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'price',            v_price,
    'token_amount',     v_token_amount
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_token_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Uses 'TKN' prefix in hashtext to avoid collision with other generators.
  perform pg_advisory_xact_lock(hashtext('TKN' || date_str));

  -- 순번 파싱 대상을 순번 형식(숫자)으로 생성된 것만 포함
  select coalesce(max(cast(substring(order_number from 14) as integer)), 0) + 1
  into seq_num
  from orders
  where order_number like 'TKN-' || date_str || '-%'
    and order_number ~ '^TKN-\d{8}-\d+$';

  order_num := 'TKN-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return order_num;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_refundable_token_orders()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_result  jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  WITH completed_token_orders AS (
    SELECT
      o.id                                              AS order_id,
      o.order_number,
      o.created_at,
      o.total_price,
      COALESCE((
        SELECT SUM(dt.amount)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
            OR dt.work_id = 'order_' || o.id::text || '_paid'
          )
      ), 0)::integer                                    AS paid_tokens_granted,
      COALESCE((
        SELECT MAX(dt.created_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
            OR dt.work_id = 'order_' || o.id::text || '_paid'
          )
      ), o.created_at)                                  AS token_granted_at,
      (
        SELECT MAX(dt.expires_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
            OR dt.work_id = 'order_' || o.id::text || '_paid'
          )
      )                                                 AS token_expires_at,
      -- 진행 중인 환불 요청 정보 (접수/완료)
      (
        SELECT jsonb_build_object('id', c.id, 'status', c.status)
        FROM public.claims c
        WHERE c.order_id = o.id
          AND c.type = 'token_refund'
          AND c.status IN ('접수', '완료')
        LIMIT 1
      )                                                 AS active_refund_request
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.order_type = 'token'
      AND o.status = '완료'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id',              cto.order_id,
      'order_number',          cto.order_number,
      'created_at',            cto.created_at,
      'total_price',           cto.total_price,
      'paid_tokens_granted',   cto.paid_tokens_granted,
      'bonus_tokens_granted',  0,
      'token_expires_at',      cto.token_expires_at,
      'is_refundable',         CASE
                                 WHEN cto.token_expires_at IS NOT NULL
                                   AND cto.token_expires_at <= now() THEN false
                                 WHEN cto.active_refund_request IS NOT NULL THEN false
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.token_granted_at
                                   ) THEN true
                                 ELSE false
                               END,
      'not_refundable_reason', CASE
                                 WHEN cto.token_expires_at IS NOT NULL
                                   AND cto.token_expires_at <= now() THEN 'expired'
                                 WHEN cto.active_refund_request IS NOT NULL THEN
                                   CASE (cto.active_refund_request->>'status')
                                     WHEN '접수' THEN 'pending_refund'
                                     WHEN '완료' THEN 'approved_refund'
                                     ELSE 'active_refund'
                                   END
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.token_granted_at
                                   ) THEN NULL
                                 ELSE 'tokens_used'
                               END,
      'pending_request_id',    CASE
                                 WHEN cto.active_refund_request IS NOT NULL
                                   THEN (cto.active_refund_request->>'id')::uuid
                                 ELSE NULL::uuid
                               END
    )
    ORDER BY cto.created_at DESC
  )
  INTO v_result
  FROM (
    SELECT
      cto.*,
      RANK() OVER (ORDER BY cto.created_at DESC, cto.order_id DESC) AS order_rank
    FROM completed_token_orders cto
  ) cto;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.lock_payment_orders(p_payment_group_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order record;
  v_locked_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_already_locked boolean := false;
  v_already_confirmed boolean := false;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  -- service role 경유(Edge Function) 시 auth.uid() = null → skip
  -- 직접 RPC 호출 시 호출자 신원 검증 (IS DISTINCT FROM: NULL 안전 비교)
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for v_order in
    select id, user_id, status, order_type
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    -- IS DISTINCT FROM: p_user_id가 NULL이어도 안전하게 비교
    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status = '대기중' then
      -- 정상 경로: 대기중 → 결제중
      update public.orders
      set status = '결제중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '대기중', '결제중', 'payment lock'
      );

    elsif v_order.status = '결제중' then
      -- 멱등: 이미 lock됨
      v_already_locked := true;

    elsif v_order.status in ('진행중', '발송대기', '발송중', '접수', '완료') then
      -- 이미 결제 완료 상태
      v_already_confirmed := true;

    else
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_locked_orders := v_locked_orders || jsonb_build_object(
      'orderId', v_order.id,
      'orderType', v_order.order_type
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'orders', v_locked_orders,
    'already_locked', v_already_locked,
    'already_confirmed', v_already_confirmed
  );
end;
$function$
;

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


CREATE OR REPLACE FUNCTION public.product_is_liked_rpc(p_id integer)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.product_likes pl
    where pl.product_id = p_id
      and pl.user_id = auth.uid()
  );
$function$
;

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


CREATE OR REPLACE FUNCTION public.refund_design_tokens(p_user_id uuid, p_amount integer, p_ai_model text, p_request_type text, p_work_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role text;
BEGIN
  -- service_role 전용: 클라이언트 직접 호출 차단
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: refund requires service_role';
  END IF;

  IF p_ai_model NOT IN ('openai', 'gemini', 'fal') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;

  IF p_request_type NOT IN ('analysis', 'render_standard', 'render_high') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;

  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  IF p_work_id IS NULL THEN
    RAISE EXCEPTION 'refund_design_tokens requires non-null p_work_id for idempotency';
  END IF;

  -- work_id 기반 멱등성: 동일 work_id로 이미 환불된 경우 무시
  INSERT INTO public.design_tokens (user_id, amount, type, token_class, ai_model, request_type, description, work_id)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    'paid',  -- 이미지 생성 실패 환불은 유료 토큰 반환
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')',
    p_work_id
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_image(p_url text, p_file_id text, p_folder text, p_entity_type text, p_entity_id text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- SECURITY INVOKER keeps the caller's auth context, so auth.uid() here is the
  -- authenticated caller identity. We verify entity ownership explicitly before
  -- the INSERT, and let the INSERT RLS policy enforce uploaded_by = auth.uid().
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_entity_type = 'product' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'quote_request' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.quote_requests qr
      WHERE qr.id::text = p_entity_id
        AND qr.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'custom_order' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'custom'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'reform' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'repair'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'design_message' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.design_chat_messages m
      JOIN public.design_chat_sessions s ON s.id = m.session_id
      WHERE m.id::text = p_entity_id
        AND s.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END IF;

  INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at)
  VALUES (p_url, p_file_id, p_folder, p_entity_type, p_entity_id, v_user_id, p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_token_refund(p_order_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id         uuid;
  v_order           record;
  v_latest_order_id uuid;
  v_paid_granted    integer;
  v_token_granted_at timestamptz;
  v_token_expires_at timestamptz;
  v_refund_amount   integer;
  v_token_item_id   uuid;
  v_claim_id        uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 주문 검증: 본인 소유 + 토큰 주문 + 완료 상태
  SELECT id, user_id, total_price, order_type, status, created_at
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     AND user_id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF v_order.order_type != 'token' THEN
    RAISE EXCEPTION 'only token orders can be refunded';
  END IF;

  IF v_order.status != '완료' THEN
    RAISE EXCEPTION 'order is not in completed status (status: %)', v_order.status;
  END IF;

  SELECT
    COALESCE(SUM(dt.amount), 0)::integer,
    MAX(dt.created_at),
    MAX(dt.expires_at)
  INTO v_paid_granted, v_token_granted_at, v_token_expires_at
  FROM public.design_tokens dt
  WHERE dt.user_id = v_user_id
    AND dt.type = 'purchase'
    AND dt.token_class = 'paid'
    AND (
      dt.source_order_id = p_order_id
      OR dt.work_id = 'order_' || p_order_id::text || '_paid'
      OR dt.work_id = 'order_' || p_order_id::text
    );

  IF v_paid_granted <= 0 THEN
    RAISE EXCEPTION 'no paid tokens found for this order';
  END IF;

  v_token_granted_at := COALESCE(v_token_granted_at, v_order.created_at);

  IF v_token_expires_at IS NOT NULL AND v_token_expires_at <= now() THEN
    RAISE EXCEPTION USING
      MESSAGE = 'token_order_expired',
      DETAIL = jsonb_build_object(
        'code', 'token_order_expired',
        'message', 'refund period has passed'
      )::text;
  END IF;

  SELECT id
    INTO v_latest_order_id
    FROM public.orders
   WHERE user_id = v_user_id
     AND order_type = 'token'
     AND status = '완료'
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  IF v_latest_order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'not the latest order';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.design_tokens dt
    WHERE dt.user_id = v_user_id
      AND dt.type = 'use'
      AND dt.created_at > v_token_granted_at
  ) THEN
    RAISE EXCEPTION 'tokens_used_after_order';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE order_id = p_order_id
      AND type = 'token_refund'
      AND status NOT IN ('거부')
  ) THEN
    RAISE EXCEPTION 'duplicate_refund_request: active refund already exists for this order';
  END IF;

  v_refund_amount := v_order.total_price;

  -- token order_item id 조회
  SELECT oi.id INTO v_token_item_id
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
    AND oi.item_type = 'token'
  ORDER BY oi.created_at
  LIMIT 1;

  IF v_token_item_id IS NULL THEN
    RAISE EXCEPTION '토큰 주문 항목을 찾을 수 없습니다.';
  END IF;

  INSERT INTO public.claims (
    user_id, order_id, order_item_id,
    claim_number, type, status,
    reason, quantity, refund_data
  )
  VALUES (
    v_user_id,
    p_order_id,
    v_token_item_id,
    'TKR-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTR(gen_random_uuid()::text, 1, 4),
    'token_refund',
    '접수',
    COALESCE(p_reason, '토큰 환불 요청'),
    1,
    jsonb_build_object(
      'paid_token_amount', v_paid_granted,
      'bonus_token_amount', 0,
      'refund_amount',      v_refund_amount
    )
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'request_id',         v_claim_id,
    'refund_amount',      v_refund_amount,
    'paid_token_amount',  v_paid_granted,
    'bonus_token_amount', 0
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unlock_payment_orders(p_payment_group_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order record;
  v_count int := 0;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  -- service role 경유(Edge Function) 시 auth.uid() = null → skip
  -- 직접 RPC 호출 시 호출자 신원 검증 (IS DISTINCT FROM: NULL 안전 비교)
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for v_order in
    select id, user_id, status
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    -- IS DISTINCT FROM: p_user_id가 NULL이어도 안전하게 비교
    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status = '결제중' then
      update public.orders
      set status = '대기중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '결제중', '대기중', 'payment unlock: approval failed'
      );

    elsif v_order.status = '대기중' then
      -- 멱등: 이미 대기중
      null;

    elsif v_order.status in ('진행중', '발송대기', '발송중', '접수', '완료') then
      -- 다른 경로로 이미 confirm됨 — skip
      null;

    end if;
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  -- 결제 실패 시 예약된 쿠폰을 활성 상태로 복원
  update public.user_coupons
  set status = 'active',
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

  return jsonb_build_object('success', true);
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



  create policy "Users can insert own images"
  on "public"."images"
  as permissive
  for insert
  to authenticated
with check ((uploaded_by = ( SELECT auth.uid() AS uid)));



  create policy "Users can view own images"
  on "public"."images"
  as permissive
  for select
  to authenticated
using ((uploaded_by = ( SELECT auth.uid() AS uid)));



  create policy "allow_public_read_pricing_constants"
  on "public"."pricing_constants"
  as permissive
  for select
  to anon, authenticated
using (true);



