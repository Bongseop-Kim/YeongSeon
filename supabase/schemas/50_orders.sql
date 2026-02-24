-- =============================================================
-- 50_orders.sql  –  Orders
-- =============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL,
  order_number        varchar(50) NOT NULL,
  shipping_address_id uuid        NOT NULL,
  total_price         integer     NOT NULL,
  original_price      integer     NOT NULL,
  total_discount      integer     NOT NULL DEFAULT 0,
  status              text        NOT NULL DEFAULT '대기중',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_order_number_key UNIQUE (order_number),
  CONSTRAINT orders_total_price_check    CHECK (total_price >= 0),
  CONSTRAINT orders_original_price_check CHECK (original_price >= 0),
  CONSTRAINT orders_total_discount_check CHECK (total_discount >= 0),
  CONSTRAINT orders_status_check
    CHECK (status = ANY (ARRAY['대기중','진행중','배송중','완료','취소'])),
  CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT orders_shipping_address_id_fkey
    FOREIGN KEY (shipping_address_id) REFERENCES public.shipping_addresses (id)
);

-- Indexes
CREATE INDEX idx_orders_user_id      ON public.orders USING btree (user_id);
CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);

-- Trigger
CREATE OR REPLACE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update order status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Privilege hardening
REVOKE UPDATE ON TABLE public.orders FROM authenticated;
GRANT UPDATE (status) ON TABLE public.orders TO authenticated;
