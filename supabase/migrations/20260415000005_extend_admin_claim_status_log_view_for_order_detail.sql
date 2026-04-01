DROP VIEW IF EXISTS public.admin_claim_status_log_view;

CREATE VIEW public.admin_claim_status_log_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.claim_id         AS "claimId",
  c.order_id         AS "orderId",
  c.claim_number     AS "claimNumber",
  c.type             AS "claimType",
  l.changed_by       AS "changedBy",
  l.previous_status  AS "previousStatus",
  l.new_status       AS "newStatus",
  l.memo,
  l.is_rollback      AS "isRollback",
  l.created_at       AS "createdAt"
FROM public.claim_status_logs l
JOIN public.claims c
  ON c.id = l.claim_id;
