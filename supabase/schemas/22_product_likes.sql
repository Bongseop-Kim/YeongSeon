-- =============================================================
-- 22_product_likes.sql  –  Product likes
-- =============================================================

CREATE TABLE IF NOT EXISTS public.product_likes (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  product_id integer     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_likes_pkey PRIMARY KEY (id),
  CONSTRAINT product_likes_user_id_product_id_key UNIQUE (user_id, product_id),
  CONSTRAINT product_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT product_likes_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_product_likes_product_id
  ON public.product_likes USING btree (product_id);
CREATE INDEX idx_product_likes_user_id
  ON public.product_likes USING btree (user_id);

-- RLS
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own likes"
  ON public.product_likes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own likes"
  ON public.product_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.product_likes FOR DELETE
  USING (auth.uid() = user_id);
