-- RLS-011: 나머지 테이블의 auth.uid() 직접 호출을 (SELECT auth.uid()) 서브쿼리로 전환
-- 이전 마이그레이션(20260410000002)에서 커버되지 않은 테이블 처리

-- ── claims ───────────────────────────────────────────────────
ALTER POLICY "Users can view their own claims"
  ON public.claims
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can create their own claims"
  ON public.claims
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ── inquiries ────────────────────────────────────────────────
ALTER POLICY "Users can view their own inquiries"
  ON public.inquiries
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can create their own inquiries"
  ON public.inquiries
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = '답변대기'
    AND answer IS NULL
    AND answer_date IS NULL
  );

ALTER POLICY "Users can update their own pending inquiries"
  ON public.inquiries
  USING ((SELECT auth.uid()) = user_id AND status = '답변대기')
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = '답변대기'
    AND answer IS NULL
    AND answer_date IS NULL
  );

ALTER POLICY "Users can delete their own pending inquiries"
  ON public.inquiries
  USING ((SELECT auth.uid()) = user_id AND status = '답변대기');

-- ── quote_requests ───────────────────────────────────────────
ALTER POLICY "Users can view their own quote requests"
  ON public.quote_requests
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert their own quote requests"
  ON public.quote_requests
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.shipping_addresses sa
      WHERE sa.id = shipping_address_id
        AND sa.user_id = (SELECT auth.uid())
    )
  );

-- ── ai_generation_logs ───────────────────────────────────────
ALTER POLICY "Users can view their own generation logs"
  ON public.ai_generation_logs
  USING ((SELECT auth.uid()) = user_id);

-- ── design_tokens ────────────────────────────────────────────
ALTER POLICY "Users can view their own design tokens"
  ON public.design_tokens
  USING ((SELECT auth.uid()) = user_id);

-- ── token_purchases ──────────────────────────────────────────
ALTER POLICY "Users can view their own token purchases"
  ON public.token_purchases
  USING ((SELECT auth.uid()) = user_id);

-- ── phone_verifications ──────────────────────────────────────
ALTER POLICY "Users can view their own phone verifications"
  ON public.phone_verifications
  USING ((SELECT auth.uid()) = user_id);

-- ── notification_preference_logs ─────────────────────────────
ALTER POLICY "Users can view their own notification preference logs"
  ON public.notification_preference_logs
  USING ((SELECT auth.uid()) = user_id);
