-- 고객용 quote_request_detail_view 생성
-- admin_memo 제외, 본인 데이터만 (security_invoker + WHERE user_id = auth.uid())
CREATE OR REPLACE VIEW public.quote_request_detail_view
WITH (security_invoker = true)
AS
SELECT
  qr.id,
  qr.quote_number        AS "quoteNumber",
  to_char(qr.created_at, 'YYYY-MM-DD') AS date,
  qr.status,
  qr.options,
  qr.quantity,
  qr.reference_images    AS "referenceImages",
  qr.additional_notes    AS "additionalNotes",
  qr.contact_name        AS "contactName",
  qr.contact_title       AS "contactTitle",
  qr.contact_method      AS "contactMethod",
  qr.contact_value       AS "contactValue",
  qr.quoted_amount       AS "quotedAmount",
  qr.quote_conditions    AS "quoteConditions",
  qr.created_at
FROM public.quote_requests qr
WHERE qr.user_id = auth.uid();
