-- Backfill delivered_at for existing '배송완료' orders that predate the column addition.
-- Without this, auto_confirm_delivered_orders() would never process these legacy rows.
UPDATE public.orders
SET delivered_at = updated_at
WHERE status = '배송완료'
  AND delivered_at IS NULL;
