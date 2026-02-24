-- =============================================================
-- 40_cart_items.sql  –  Cart items
-- =============================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL,
  item_id                 text        NOT NULL,
  item_type               text        NOT NULL,
  product_id              integer,
  selected_option_id      text,
  reform_data             jsonb,
  quantity                integer     NOT NULL,
  applied_user_coupon_id  uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_unique_user_item UNIQUE (user_id, item_id),
  CONSTRAINT cart_items_item_type_check
    CHECK (item_type = ANY (ARRAY['product','reform'])),
  CONSTRAINT cart_items_quantity_check
    CHECK (quantity > 0),
  CONSTRAINT cart_items_type_check
    CHECK (
      (item_type = 'product' AND product_id IS NOT NULL AND reform_data IS NULL)
      OR
      (item_type = 'reform' AND product_id IS NULL AND reform_data IS NOT NULL)
    ),
  CONSTRAINT cart_items_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_cart_items_user_id    ON public.cart_items USING btree (user_id);
CREATE INDEX idx_cart_items_created_at ON public.cart_items USING btree (created_at);
CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id)
  WHERE product_id IS NOT NULL;

-- Trigger
CREATE OR REPLACE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cart_items_updated_at();

-- RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);
