-- =============================================================
-- RLS 최적화: 로그 테이블 4곳의 auth.uid() → (SELECT auth.uid()) 전환
--
-- 대상 테이블:
--   - order_status_logs
--   - claim_status_logs
--   - claim_notification_logs
--   - quote_request_status_logs
--
-- 변경 이유:
--   20260410000002/0004 마이그레이션에서 주요 테이블은 최적화됐으나
--   이 4개 로그 테이블이 누락됨. (SELECT auth.uid())는 Postgres가
--   initPlan으로 캐싱하여 EXISTS 서브쿼리 행마다 재호출을 방지함.
-- =============================================================

-- ── order_status_logs ────────────────────────────────────────
DROP POLICY "Users can view logs of their own orders" ON public.order_status_logs;

CREATE POLICY "Users can view logs of their own orders"
  ON public.order_status_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.user_id = (SELECT auth.uid())
    )
  );

-- ── claim_status_logs ────────────────────────────────────────
DROP POLICY "Users can view logs of their own claims" ON public.claim_status_logs;

CREATE POLICY "Users can view logs of their own claims"
  ON public.claim_status_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- ── claim_notification_logs ──────────────────────────────────
DROP POLICY "Users can view logs of their own claim notifications" ON public.claim_notification_logs;

CREATE POLICY "Users can view logs of their own claim notifications"
  ON public.claim_notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- ── quote_request_status_logs ────────────────────────────────
DROP POLICY "Users can view logs of their own quote requests" ON public.quote_request_status_logs;

CREATE POLICY "Users can view logs of their own quote requests"
  ON public.quote_request_status_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.user_id = (SELECT auth.uid())
    )
  );
