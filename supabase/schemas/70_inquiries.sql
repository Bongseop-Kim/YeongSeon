-- =============================================================
-- 70_inquiries.sql  –  Customer inquiries
-- =============================================================

CREATE TABLE IF NOT EXISTS public.inquiries (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid,
  title       text        NOT NULL,
  content     text        NOT NULL,
  status      text        NOT NULL DEFAULT '답변대기',
  answer      text,
  answer_date timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  category    text        NOT NULL DEFAULT '일반',
  product_id  integer,

  CONSTRAINT inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT inquiries_title_check
    CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT inquiries_content_check
    CHECK (char_length(content) BETWEEN 1 AND 5000),
  CONSTRAINT inquiries_status_check
    CHECK (status = ANY (ARRAY['답변대기','답변완료'])),
  CONSTRAINT inquiries_answer_pair_check
    CHECK ((answer IS NULL AND answer_date IS NULL) OR (answer IS NOT NULL AND answer_date IS NOT NULL)),
  CONSTRAINT inquiries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT inquiries_category_check
    CHECK (category = ANY (ARRAY['일반','상품','수선','주문제작'])),
  CONSTRAINT inquiries_product_category_check
    CHECK (product_id IS NULL OR category = '상품'),
  CONSTRAINT inquiries_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_inquiries_user_id    ON public.inquiries USING btree (user_id);
CREATE INDEX idx_inquiries_status     ON public.inquiries USING btree (status);
CREATE INDEX idx_inquiries_category   ON public.inquiries USING btree (category);
CREATE INDEX idx_inquiries_product_id ON public.inquiries USING btree (product_id);

-- Trigger
CREATE OR REPLACE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own inquiries"
  ON public.inquiries FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = '답변대기'
    AND answer IS NULL
    AND answer_date IS NULL
  );

CREATE POLICY "Users can update their own pending inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id AND status = '답변대기')
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = '답변대기'
    AND answer IS NULL
    AND answer_date IS NULL
  );

CREATE POLICY "Users can delete their own pending inquiries"
  ON public.inquiries FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id AND status = '답변대기');

CREATE POLICY "Admins can view all inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can answer inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (
    public.is_admin()
    AND status = '답변완료'
    AND answer IS NOT NULL
    AND answer_date IS NOT NULL
  );

CREATE POLICY "service_role_select_inquiries"
  ON public.inquiries FOR SELECT
  TO service_role USING (true);

CREATE POLICY "service_role_insert_inquiries"
  ON public.inquiries FOR INSERT
  TO service_role WITH CHECK (true);

CREATE POLICY "service_role_update_inquiries"
  ON public.inquiries FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_delete_inquiries"
  ON public.inquiries FOR DELETE
  TO service_role USING (true);

-- Privilege hardening for user updates
REVOKE UPDATE ON TABLE public.inquiries FROM authenticated;
GRANT UPDATE (title, content) ON TABLE public.inquiries TO authenticated;
-- Admin columns for answering inquiries
GRANT UPDATE (status, answer, answer_date) ON TABLE public.inquiries TO authenticated;
GRANT UPDATE (category, product_id) ON TABLE public.inquiries TO authenticated;
