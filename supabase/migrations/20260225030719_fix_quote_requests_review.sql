-- =============================================================
-- Migration: Fix quote requests (code review)
-- - Add quoted_amount >= 0 CHECK constraint
-- - Fix INSERT policy to verify shipping_address ownership
-- - Fix status_logs INSERT policy to enforce changed_by = auth.uid()
-- - Remove updated_at from column-level GRANT (trigger handles it)
-- - Alias timestamps to camelCase in views
-- - Add admin_quote_request_status_log_view
-- - Add state-transition validation in admin_update_quote_request_status
-- =============================================================

-- 1. quoted_amount non-negative constraint
ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_quoted_amount_nonneg CHECK (quoted_amount >= 0);

-- 2. Fix INSERT policy: verify shipping_address ownership
DROP POLICY IF EXISTS "Users can insert their own quote requests" ON public.quote_requests;
CREATE POLICY "Users can insert their own quote requests"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.shipping_addresses sa
      WHERE sa.id = shipping_address_id
        AND sa.user_id = auth.uid()
    )
  );

-- 3. Fix status_logs INSERT policy: enforce changed_by = auth.uid()
DROP POLICY IF EXISTS "Admins can insert status logs" ON public.quote_request_status_logs;
CREATE POLICY "Admins can insert status logs"
  ON public.quote_request_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND changed_by = auth.uid());

-- 4. Remove updated_at from column-level GRANT (trigger is sole writer)
REVOKE UPDATE ON TABLE public.quote_requests FROM authenticated;
GRANT UPDATE (status, quoted_amount, quote_conditions, admin_memo) ON TABLE public.quote_requests TO authenticated;

-- 5. Alias timestamps to camelCase in admin_quote_request_list_view
--    DROP required: CREATE OR REPLACE cannot rename existing columns
DROP VIEW IF EXISTS public.admin_quote_request_list_view;
CREATE VIEW public.admin_quote_request_list_view
WITH (security_invoker = true)
AS
SELECT
  qr.id,
  qr.user_id        AS "userId",
  qr.quote_number    AS "quoteNumber",
  to_char(qr.created_at, 'YYYY-MM-DD') AS date,
  qr.status,
  qr.quantity,
  qr.quoted_amount   AS "quotedAmount",
  qr.contact_name    AS "contactName",
  qr.contact_title   AS "contactTitle",
  qr.contact_method  AS "contactMethod",
  qr.contact_value   AS "contactValue",
  qr.created_at      AS "createdAt",
  qr.updated_at      AS "updatedAt",
  p.name             AS "customerName",
  p.phone            AS "customerPhone",
  public.admin_get_email(qr.user_id) AS "customerEmail"
FROM public.quote_requests qr
LEFT JOIN public.profiles p ON p.id = qr.user_id;

-- 6. Alias timestamps to camelCase in admin_quote_request_detail_view
DROP VIEW IF EXISTS public.admin_quote_request_detail_view;
CREATE VIEW public.admin_quote_request_detail_view
WITH (security_invoker = true)
AS
SELECT
  qr.id,
  qr.user_id        AS "userId",
  qr.quote_number    AS "quoteNumber",
  to_char(qr.created_at, 'YYYY-MM-DD') AS date,
  qr.status,
  qr.options,
  qr.quantity,
  qr.reference_image_urls AS "referenceImageUrls",
  qr.additional_notes     AS "additionalNotes",
  qr.contact_name    AS "contactName",
  qr.contact_title   AS "contactTitle",
  qr.contact_method  AS "contactMethod",
  qr.contact_value   AS "contactValue",
  qr.quoted_amount   AS "quotedAmount",
  qr.quote_conditions AS "quoteConditions",
  qr.admin_memo      AS "adminMemo",
  qr.created_at      AS "createdAt",
  qr.updated_at      AS "updatedAt",
  p.name             AS "customerName",
  p.phone            AS "customerPhone",
  public.admin_get_email(qr.user_id) AS "customerEmail",
  sa.recipient_name   AS "recipientName",
  sa.recipient_phone  AS "recipientPhone",
  sa.address          AS "shippingAddress",
  sa.address_detail   AS "shippingAddressDetail",
  sa.postal_code      AS "shippingPostalCode",
  sa.delivery_memo    AS "deliveryMemo",
  sa.delivery_request AS "deliveryRequest"
FROM public.quote_requests qr
LEFT JOIN public.profiles p ON p.id = qr.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = qr.shipping_address_id;

-- 7. New view for status logs (camelCase aliases)
CREATE OR REPLACE VIEW public.admin_quote_request_status_log_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.quote_request_id AS "quoteRequestId",
  l.changed_by       AS "changedBy",
  l.previous_status  AS "previousStatus",
  l.new_status       AS "newStatus",
  l.memo,
  l.created_at       AS "createdAt"
FROM public.quote_request_status_logs l;

-- 8. Update admin_update_quote_request_status with state-transition validation
CREATE OR REPLACE FUNCTION public.admin_update_quote_request_status(
  p_quote_request_id uuid,
  p_new_status text,
  p_quoted_amount integer DEFAULT NULL,
  p_quote_conditions text DEFAULT NULL,
  p_admin_memo text DEFAULT NULL,
  p_memo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_current_status text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status
  select qr.status
  into v_current_status
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if not found then
    raise exception 'Quote request not found';
  end if;

  -- Validate new status
  if p_new_status is null or p_new_status not in ('요청', '견적발송', '협의중', '확정', '종료') then
    raise exception 'Invalid status';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  -- Validate state transition
  if not (
    (v_current_status = '요청'     and p_new_status in ('견적발송', '종료'))
    or (v_current_status = '견적발송' and p_new_status in ('협의중', '종료'))
    or (v_current_status = '협의중'   and p_new_status in ('확정', '종료'))
  ) then
    raise exception 'Invalid transition from "%" to "%"', v_current_status, p_new_status;
  end if;

  -- Validate quoted_amount is non-negative
  if p_quoted_amount is not null and p_quoted_amount < 0 then
    raise exception 'Quoted amount must be non-negative';
  end if;

  -- Update quote request
  update public.quote_requests
  set
    status = p_new_status,
    quoted_amount = coalesce(p_quoted_amount, quoted_amount),
    quote_conditions = coalesce(p_quote_conditions, quote_conditions),
    admin_memo = coalesce(p_admin_memo, admin_memo)
  where id = p_quote_request_id;

  -- Insert status log
  insert into public.quote_request_status_logs (
    quote_request_id,
    changed_by,
    previous_status,
    new_status,
    memo
  )
  values (
    p_quote_request_id,
    v_admin_id,
    v_current_status,
    p_new_status,
    p_memo
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;
