-- =============================================================
-- 70_inquiries.sql  –  Customer inquiries
-- =============================================================

CREATE TABLE IF NOT EXISTS public.inquiries (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  title       text        NOT NULL,
  content     text        NOT NULL,
  status      text        NOT NULL DEFAULT '답변대기',
  answer      text,
  answer_date timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

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
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_inquiries_user_id ON public.inquiries USING btree (user_id);
CREATE INDEX idx_inquiries_status  ON public.inquiries USING btree (status);

-- Trigger
CREATE OR REPLACE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inquiries"
  ON public.inquiries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending inquiries"
  ON public.inquiries FOR UPDATE
  USING (auth.uid() = user_id AND status = '답변대기')
  WITH CHECK (auth.uid() = user_id AND status = '답변대기' AND answer IS NULL AND answer_date IS NULL);

CREATE POLICY "Users can delete their own pending inquiries"
  ON public.inquiries FOR DELETE
  USING (auth.uid() = user_id AND status = '답변대기');
