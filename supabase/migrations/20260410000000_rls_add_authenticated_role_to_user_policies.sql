-- RLS-006: 사용자 정책에 TO authenticated 명시
-- 각 정책을 DROP 후 TO authenticated를 추가하여 재생성한다.
-- 이미 TO authenticated가 있는 admin 정책은 변경하지 않는다.

-- ── cart_items ──────────────────────────────────────────────
DROP POLICY "Users can view their own cart items"   ON public.cart_items;
DROP POLICY "Users can insert their own cart items" ON public.cart_items;
DROP POLICY "Users can update their own cart items" ON public.cart_items;
DROP POLICY "Users can delete their own cart items" ON public.cart_items;

CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── product_likes ────────────────────────────────────────────
DROP POLICY "Users can view their own likes"   ON public.product_likes;
DROP POLICY "Users can insert their own likes" ON public.product_likes;
DROP POLICY "Users can delete their own likes" ON public.product_likes;

CREATE POLICY "Users can view their own likes"
  ON public.product_likes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own likes"
  ON public.product_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.product_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── orders ───────────────────────────────────────────────────
DROP POLICY "Users can view their own orders"   ON public.orders;
DROP POLICY "Users can create their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── profiles ─────────────────────────────────────────────────
DROP POLICY "Users can view their own profile"   ON public.profiles;
DROP POLICY "Users can insert their own profile" ON public.profiles;
DROP POLICY "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'customer'
    AND is_active = true
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    AND role = 'customer'
    AND is_active = true
  )
  WITH CHECK (
    auth.uid() = id
    AND role = 'customer'
    AND is_active = true
  );

-- ── shipping_addresses ──────────────────────────────────────
-- SELECT는 이미 TO authenticated 있음. INSERT / UPDATE / DELETE 누락.
DROP POLICY "Enable insert for users based on user_id" ON public.shipping_addresses;
DROP POLICY "Enable update for users based on user_id" ON public.shipping_addresses;
DROP POLICY "Enable delete for users based on user_id" ON public.shipping_addresses;

CREATE POLICY "Enable insert for users based on user_id"
  ON public.shipping_addresses FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON public.shipping_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON public.shipping_addresses FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ── user_coupons ────────────────────────────────────────────
DROP POLICY "user_coupons_select_own" ON public.user_coupons;

CREATE POLICY "user_coupons_select_own"
  ON public.user_coupons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
