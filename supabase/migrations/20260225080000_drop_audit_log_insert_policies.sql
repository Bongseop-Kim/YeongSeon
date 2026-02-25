-- =============================================================
-- Migration: Drop direct INSERT policies on audit log tables
--
-- The status-change RPCs (admin_update_order_status,
-- admin_update_claim_status) are SECURITY DEFINER and bypass RLS.
-- Removing these INSERT policies prevents admins from writing
-- audit rows directly via the client, while RPC writes are
-- unaffected.
-- =============================================================

DROP POLICY "Admins can insert order status logs"
  ON public.order_status_logs;

DROP POLICY "Admins can insert claim status logs"
  ON public.claim_status_logs;
