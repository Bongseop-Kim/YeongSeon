-- =============================================================
-- Migration: Add delivery confirmation columns to orders table
-- =============================================================

-- 1. Add delivered_at and confirmed_at columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at  timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at  timestamptz;

-- 2. Update status CHECK constraint to include '배송완료'
ALTER TABLE public.orders
  DROP CONSTRAINT orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK (status = ANY (ARRAY[
      '대기중','진행중','배송중','배송완료','완료','취소',
      '접수','제작중','제작완료',
      '수선중','수선완료'
    ]));

-- 3. Grant UPDATE on new columns to authenticated role
GRANT UPDATE (delivered_at, confirmed_at) ON TABLE public.orders TO authenticated;

-- 4. Index for auto-confirmation batch job (pending confirmation after 7 days)
CREATE INDEX IF NOT EXISTS idx_orders_pending_confirmation
  ON public.orders (delivered_at)
  WHERE status = '배송완료';

-- 5. Backfill confirmed_at for existing '완료' orders
UPDATE public.orders
SET confirmed_at = updated_at
WHERE status = '완료'
  AND confirmed_at IS NULL;
