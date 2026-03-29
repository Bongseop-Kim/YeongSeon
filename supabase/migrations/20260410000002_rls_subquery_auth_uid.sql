-- RLS-011: auth.uid() 직접 호출을 (SELECT auth.uid()) 서브쿼리로 교체
-- Postgres optimizer가 initPlan으로 트랜잭션당 1회만 평가하도록 한다.
-- shipping_addresses의 UPDATE 정책도 포함한다.

-- ── cart_items ──────────────────────────────────────────────
DROP POLICY "Users can view their own cart items"   ON public.cart_items;
DROP POLICY "Users can insert their own cart items" ON public.cart_items;
DROP POLICY "Users can update their own cart items" ON public.cart_items;
DROP POLICY "Users can delete their own cart items" ON public.cart_items;

CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own cart items"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ── product_likes ────────────────────────────────────────────
DROP POLICY "Users can view their own likes"   ON public.product_likes;
DROP POLICY "Users can insert their own likes" ON public.product_likes;
DROP POLICY "Users can delete their own likes" ON public.product_likes;

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

-- ── orders ───────────────────────────────────────────────────
DROP POLICY "Users can view their own orders"   ON public.orders;
DROP POLICY "Users can create their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ── profiles ─────────────────────────────────────────────────
DROP POLICY "Users can view their own profile"   ON public.profiles;
DROP POLICY "Users can insert their own profile" ON public.profiles;
DROP POLICY "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND role = 'customer'
    AND is_active = true
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    AND role = 'customer'
    AND is_active = true
  )
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND role = 'customer'
    AND is_active = true
  );

-- ── shipping_addresses (UPDATE 누락분만 수정) ────────────────
DROP POLICY "Enable update for users based on user_id" ON public.shipping_addresses;

CREATE POLICY "Enable update for users based on user_id"
  ON public.shipping_addresses FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ── user_coupons ────────────────────────────────────────────
DROP POLICY "user_coupons_select_own" ON public.user_coupons;

CREATE POLICY "user_coupons_select_own"
  ON public.user_coupons FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ── images (사용자 정책) ─────────────────────────────────────
DROP POLICY "Users can view own images"   ON public.images;
DROP POLICY "Users can insert own images" ON public.images;

CREATE POLICY "Users can view own images"
  ON public.images FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = uploaded_by);

CREATE POLICY "Users can insert own images"
  ON public.images FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = uploaded_by);
