-- RLS-004: FOR ALL 암묵 적용 service_role 정책을 4개로 분리
-- auth.role() 조건 대신 TO service_role 역할 명시로 전환

-- ── coupons ──────────────────────────────────────────────────
DROP POLICY "Allow service role full access to coupons" ON public.coupons;

CREATE POLICY "service_role_select_coupons"
  ON public.coupons FOR SELECT
  TO service_role USING (true);

CREATE POLICY "service_role_insert_coupons"
  ON public.coupons FOR INSERT
  TO service_role WITH CHECK (true);

CREATE POLICY "service_role_update_coupons"
  ON public.coupons FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_delete_coupons"
  ON public.coupons FOR DELETE
  TO service_role USING (true);

-- ── user_coupons ──────────────────────────────────────────────
DROP POLICY "user_coupons_service_all" ON public.user_coupons;

CREATE POLICY "service_role_select_user_coupons"
  ON public.user_coupons FOR SELECT
  TO service_role USING (true);

CREATE POLICY "service_role_insert_user_coupons"
  ON public.user_coupons FOR INSERT
  TO service_role WITH CHECK (true);

CREATE POLICY "service_role_update_user_coupons"
  ON public.user_coupons FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_delete_user_coupons"
  ON public.user_coupons FOR DELETE
  TO service_role USING (true);

-- ── inquiries ─────────────────────────────────────────────────
DROP POLICY "inquiries_service_all" ON public.inquiries;

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
