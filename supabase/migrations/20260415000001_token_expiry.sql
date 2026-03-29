-- =====================================================================
-- 토큰 만료 기능 구현 (토스페이먼츠 충전형 상품 규정 준수)
-- 유상 토큰 이용기간·환불 가능기간: 결제 시점으로부터 1년 이내
-- =====================================================================

ALTER TABLE public.design_tokens
  ADD COLUMN source_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN expires_at timestamptz;

CREATE INDEX idx_design_tokens_source_order_id
  ON public.design_tokens (source_order_id)
  WHERE source_order_id IS NOT NULL;

CREATE INDEX idx_design_tokens_user_paid_expiry
  ON public.design_tokens (user_id, expires_at)
  WHERE token_class = 'paid' AND expires_at IS NOT NULL;
