-- supabase/migrations/20260309900000_inquiry_category_and_product.sql

ALTER TABLE public.inquiries
  ADD COLUMN category text NOT NULL DEFAULT '일반'
    CONSTRAINT inquiries_category_check
      CHECK (category = ANY (ARRAY['일반','상품','수선','주문제작'])),
  ADD COLUMN product_id integer
    REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_product_category_check
    CHECK (product_id IS NULL OR category = '상품');

CREATE INDEX idx_inquiries_category   ON public.inquiries (category);
CREATE INDEX idx_inquiries_product_id ON public.inquiries (product_id);

-- category, product_id 컬럼 수정 권한 부여 (사용자: 답변대기 상태에서만 RLS 허용)
GRANT UPDATE (category, product_id) ON TABLE public.inquiries TO authenticated;
