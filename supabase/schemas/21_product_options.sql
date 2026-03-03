-- =============================================================
-- 21_product_options.sql  –  Product options
-- =============================================================

CREATE TABLE IF NOT EXISTS public.product_options (
  id               uuid         NOT NULL DEFAULT gen_random_uuid(),
  product_id       integer      NOT NULL,
  option_id        varchar(50)  NOT NULL,
  name             varchar(255) NOT NULL,
  additional_price integer      NOT NULL DEFAULT 0,
  stock            integer,
  created_at       timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT product_options_pkey PRIMARY KEY (id),
  CONSTRAINT product_options_product_id_option_id_key UNIQUE (product_id, option_id),
  CONSTRAINT product_options_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE,
  CONSTRAINT product_options_stock_check
    CHECK (stock IS NULL OR stock >= 0)
);

-- Index
CREATE INDEX idx_product_options_product_id
  ON public.product_options USING btree (product_id);

-- RLS
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to product_options"
  ON public.product_options FOR SELECT
  USING (true);

-- Admin policies
CREATE POLICY "Admins can insert product options"
  ON public.product_options FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update product options"
  ON public.product_options FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete product options"
  ON public.product_options FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── replace_product_options ──────────────────────────────────
-- 관리자 전용: product_options를 트랜잭션 내에서 삭제 후 재삽입.
-- SECURITY INVOKER: 호출자(관리자)의 RLS 정책("Admins can delete/insert product_options")으로 실행.
CREATE OR REPLACE FUNCTION public.replace_product_options(
  p_product_id integer,
  p_options     jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.product_options
  WHERE product_id = p_product_id;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'p_options must be a JSON array';
  END IF;

  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO public.product_options
      (product_id, option_id, name, additional_price, stock)
    SELECT
      p_product_id,
      (elem->>'option_id')::varchar(50),
      (elem->>'name')::varchar(255),
      (elem->>'additional_price')::integer,
      CASE WHEN elem->>'stock' IS NULL THEN NULL
           ELSE (elem->>'stock')::integer END
    FROM jsonb_array_elements(p_options) AS elem;
  END IF;
END;
$$;
