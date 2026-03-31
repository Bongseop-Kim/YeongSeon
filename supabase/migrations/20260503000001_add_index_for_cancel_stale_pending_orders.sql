CREATE INDEX idx_orders_stale_pending_created_at
  ON public.orders (created_at)
  WHERE status = '대기중';
