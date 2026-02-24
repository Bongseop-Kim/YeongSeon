-- =============================================================
-- 21_product_options.sql  –  Product options
-- =============================================================

CREATE TABLE IF NOT EXISTS public.product_options (
  id               uuid         NOT NULL DEFAULT gen_random_uuid(),
  product_id       integer      NOT NULL,
  option_id        varchar(50)  NOT NULL,
  name             varchar(255) NOT NULL,
  additional_price integer      NOT NULL DEFAULT 0,
  created_at       timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT product_options_pkey PRIMARY KEY (id),
  CONSTRAINT product_options_product_id_option_id_key UNIQUE (product_id, option_id),
  CONSTRAINT product_options_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE
);

-- Index
CREATE INDEX idx_product_options_product_id
  ON public.product_options USING btree (product_id);

-- RLS
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to product_options"
  ON public.product_options FOR SELECT
  USING (true);
