-- admin_order_status_log_view, admin_claim_status_log_view가 squash에서
-- security_invoker 없이 생성되어 실제 DB가 RLS를 우회하는 상태였음.
-- 스키마 파일(90_views.sql)과 동기화하여 security_invoker = true 적용.

CREATE OR REPLACE VIEW public.admin_order_status_log_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.order_id         AS "orderId",
  l.changed_by       AS "changedBy",
  l.previous_status  AS "previousStatus",
  l.new_status       AS "newStatus",
  l.memo,
  l.is_rollback      AS "isRollback",
  l.created_at       AS "createdAt"
FROM public.order_status_logs l;

CREATE OR REPLACE VIEW public.admin_claim_status_log_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.claim_id         AS "claimId",
  l.changed_by       AS "changedBy",
  l.previous_status  AS "previousStatus",
  l.new_status       AS "newStatus",
  l.memo,
  l.is_rollback      AS "isRollback",
  l.created_at       AS "createdAt"
FROM public.claim_status_logs l;
