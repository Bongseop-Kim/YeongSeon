ALTER TABLE public.orders
  ADD COLUMN payment_group_id uuid,
  ADD COLUMN shipping_cost integer NOT NULL DEFAULT 0;

CREATE INDEX idx_orders_payment_group_id ON public.orders (payment_group_id);
ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_cost_check CHECK (shipping_cost >= 0);
