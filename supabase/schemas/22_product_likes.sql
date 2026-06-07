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

CREATE TABLE IF NOT EXISTS public.product_like_counts (
  product_id integer PRIMARY KEY REFERENCES public.products (id) ON DELETE CASCADE,
  likes      integer     NOT NULL DEFAULT 0 CHECK (likes >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.product_like_counts (product_id, likes)
SELECT product_id, count(*)::integer
FROM public.product_likes
GROUP BY product_id
ON CONFLICT (product_id) DO UPDATE
SET likes = EXCLUDED.likes,
    updated_at = now();

-- SECURITY DEFINER 사유: product_likes RLS는 원본 좋아요 행을 보호하고,
-- trigger는 클라이언트에 product_like_counts 쓰기 권한을 열지 않고 공개 집계만 유지한다.
CREATE OR REPLACE FUNCTION public.sync_product_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_like_counts (product_id, likes)
    VALUES (NEW.product_id, 1)
    ON CONFLICT (product_id) DO UPDATE
    SET likes = public.product_like_counts.likes + 1,
        updated_at = now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.product_like_counts
    SET likes = greatest(likes - 1, 0),
        updated_at = now()
    WHERE product_id = OLD.product_id;

    DELETE FROM public.product_like_counts
    WHERE product_id = OLD.product_id
      AND likes = 0;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    UPDATE public.product_like_counts
    SET likes = greatest(likes - 1, 0),
        updated_at = now()
    WHERE product_id = OLD.product_id;

    DELETE FROM public.product_like_counts
    WHERE product_id = OLD.product_id
      AND likes = 0;

    INSERT INTO public.product_like_counts (product_id, likes)
    VALUES (NEW.product_id, 1)
    ON CONFLICT (product_id) DO UPDATE
    SET likes = public.product_like_counts.likes + 1,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_product_like_counts()
  IS 'SECURITY DEFINER is required for product_likes triggers to maintain the public aggregate table without granting direct write access to clients.';

DROP TRIGGER IF EXISTS sync_product_like_counts_trigger ON public.product_likes;
CREATE TRIGGER sync_product_like_counts_trigger
AFTER INSERT OR DELETE OR UPDATE OF product_id ON public.product_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_product_like_counts();

REVOKE ALL ON FUNCTION public.sync_product_like_counts()
  FROM PUBLIC, anon, authenticated, service_role;

-- RLS
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_like_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own likes"
  ON public.product_likes FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own likes"
  ON public.product_likes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.product_likes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Public can view product like counts"
  ON public.product_like_counts FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.product_like_counts
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.product_like_counts
  TO anon, authenticated, service_role;
