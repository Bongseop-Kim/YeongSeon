-- =============================================================
-- Migration: Fix audit log FK constraints + RPC overload ambiguity
--
-- 1. Drop old 3-param overloads of admin_update_order_status
--    and admin_update_claim_status to eliminate PostgREST ambiguity
-- 2. Change changed_by FK on order_status_logs / claim_status_logs
--    from ON DELETE CASCADE to ON DELETE SET NULL for audit preservation
-- =============================================================

-- ── 1. Drop old 3-param RPC overloads ──────────────────────────

DROP FUNCTION IF EXISTS public.admin_update_order_status(uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_update_claim_status(uuid, text, text);

-- ── 2. Fix order_status_logs.changed_by FK ─────────────────────

ALTER TABLE public.order_status_logs
  ALTER COLUMN changed_by DROP NOT NULL;

ALTER TABLE public.order_status_logs
  DROP CONSTRAINT order_status_logs_changed_by_fkey;

ALTER TABLE public.order_status_logs
  ADD CONSTRAINT order_status_logs_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ── 3. Fix claim_status_logs.changed_by FK ─────────────────────

ALTER TABLE public.claim_status_logs
  ALTER COLUMN changed_by DROP NOT NULL;

ALTER TABLE public.claim_status_logs
  DROP CONSTRAINT claim_status_logs_changed_by_fkey;

ALTER TABLE public.claim_status_logs
  ADD CONSTRAINT claim_status_logs_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
