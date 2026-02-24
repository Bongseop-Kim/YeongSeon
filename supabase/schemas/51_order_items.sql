-- =============================================================
-- 51_order_items.sql  –  Order items (includes line_discount_amount)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id                uuid        NOT NULL,
  item_id                 text        NOT NULL,
  item_type               text        NOT NULL,
  product_id              integer,
  selected_option_id      text,
  reform_data             jsonb,
  quantity                integer     NOT NULL,
  unit_price              integer     NOT NULL,
  discount_amount         integer     NOT NULL DEFAULT 0,
  applied_user_coupon_id  uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  line_discount_amount    integer     NOT NULL DEFAULT 0,

  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_item_type_check
    CHECK (item_type = ANY (ARRAY['product','reform'])),
  CONSTRAINT order_items_quantity_check       CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_check     CHECK (unit_price >= 0),
  CONSTRAINT order_items_discount_amount_check      CHECK (discount_amount >= 0),
  CONSTRAINT order_items_line_discount_amount_check CHECK (line_discount_amount >= 0),
  CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products (id),
  CONSTRAINT order_items_applied_user_coupon_id_fkey
    FOREIGN KEY (applied_user_coupon_id) REFERENCES public.user_coupons (id)
);

-- Indexes
CREATE INDEX idx_order_items_order_id   ON public.order_items USING btree (order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);

-- RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  ));
