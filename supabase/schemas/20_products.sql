-- =============================================================
-- 20_products.sql  –  Products table
-- =============================================================

CREATE SEQUENCE IF NOT EXISTS public.products_id_seq
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.products (
  id            integer      NOT NULL DEFAULT nextval('public.products_id_seq'::regclass),
  code          varchar(255) NOT NULL,
  name          varchar(255) NOT NULL,
  price         integer      NOT NULL,
  image         text         NOT NULL,
  category      varchar(50)  NOT NULL,
  color         varchar(50)  NOT NULL,
  pattern       varchar(50)  NOT NULL,
  material      varchar(50)  NOT NULL,
  info          text         NOT NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  detail_images text[],

  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_code_key UNIQUE (code),
  CONSTRAINT products_category_check
    CHECK ((category)::text = ANY ((ARRAY['3fold'::character varying, 'sfolderato'::character varying, 'knit'::character varying, 'bowtie'::character varying])::text[])),
  CONSTRAINT products_color_check
    CHECK ((color)::text = ANY ((ARRAY['black'::character varying, 'navy'::character varying, 'gray'::character varying, 'wine'::character varying, 'blue'::character varying, 'brown'::character varying, 'beige'::character varying, 'silver'::character varying])::text[])),
  CONSTRAINT products_material_check
    CHECK ((material)::text = ANY ((ARRAY['silk'::character varying, 'cotton'::character varying, 'polyester'::character varying, 'wool'::character varying])::text[])),
  CONSTRAINT products_pattern_check
    CHECK ((pattern)::text = ANY ((ARRAY['solid'::character varying, 'stripe'::character varying, 'dot'::character varying, 'check'::character varying, 'paisley'::character varying])::text[]))
);

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;

-- Indexes
CREATE INDEX idx_products_category ON public.products USING btree (category);
CREATE INDEX idx_products_color    ON public.products USING btree (color);
CREATE INDEX idx_products_material ON public.products USING btree (material);
CREATE INDEX idx_products_pattern  ON public.products USING btree (pattern);
CREATE INDEX idx_products_price    ON public.products USING btree (price);

-- Trigger
CREATE OR REPLACE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to products"
  ON public.products FOR SELECT
  USING (true);
