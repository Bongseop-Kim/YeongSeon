-- =============================================================
-- Fix admin RLS infinite recursion on profiles
-- Replace inline EXISTS subqueries with SECURITY DEFINER is_admin()
-- =============================================================

-- 1. Create is_admin() function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin'::public.user_role, 'manager'::public.user_role)
  );
$$;

-- 2. Drop all admin policies (they used inline EXISTS, need to recreate with is_admin())
DROP POLICY IF EXISTS "Admins can view all profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Admins can update profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Admins can view all shipping addresses" ON "public"."shipping_addresses";
DROP POLICY IF EXISTS "Admins can insert products" ON "public"."products";
DROP POLICY IF EXISTS "Admins can update products" ON "public"."products";
DROP POLICY IF EXISTS "Admins can delete products" ON "public"."products";
DROP POLICY IF EXISTS "Admins can insert product options" ON "public"."product_options";
DROP POLICY IF EXISTS "Admins can update product options" ON "public"."product_options";
DROP POLICY IF EXISTS "Admins can delete product options" ON "public"."product_options";
DROP POLICY IF EXISTS "Admins can insert coupons" ON "public"."coupons";
DROP POLICY IF EXISTS "Admins can update coupons" ON "public"."coupons";
DROP POLICY IF EXISTS "Admins can delete coupons" ON "public"."coupons";
DROP POLICY IF EXISTS "Admins can view all user coupons" ON "public"."user_coupons";
DROP POLICY IF EXISTS "Admins can insert user coupons" ON "public"."user_coupons";
DROP POLICY IF EXISTS "Admins can update user coupons" ON "public"."user_coupons";
DROP POLICY IF EXISTS "Admins can view all orders" ON "public"."orders";
DROP POLICY IF EXISTS "Admins can update order status" ON "public"."orders";
DROP POLICY IF EXISTS "Admins can view all order items" ON "public"."order_items";
DROP POLICY IF EXISTS "Admins can view all claims" ON "public"."claims";
DROP POLICY IF EXISTS "Admins can update claim status" ON "public"."claims";
DROP POLICY IF EXISTS "Admins can view all inquiries" ON "public"."inquiries";
DROP POLICY IF EXISTS "Admins can answer inquiries" ON "public"."inquiries";

-- 3. Recreate all admin policies using public.is_admin()

-- profiles
CREATE POLICY "Admins can view all profiles"
  ON "public"."profiles" FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON "public"."profiles" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- shipping_addresses
CREATE POLICY "Admins can view all shipping addresses"
  ON "public"."shipping_addresses" FOR SELECT TO authenticated
  USING (public.is_admin());

-- products
CREATE POLICY "Admins can insert products"
  ON "public"."products" FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
  ON "public"."products" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON "public"."products" FOR DELETE TO authenticated
  USING (public.is_admin());

-- product_options
CREATE POLICY "Admins can insert product options"
  ON "public"."product_options" FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update product options"
  ON "public"."product_options" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete product options"
  ON "public"."product_options" FOR DELETE TO authenticated
  USING (public.is_admin());

-- coupons
CREATE POLICY "Admins can insert coupons"
  ON "public"."coupons" FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update coupons"
  ON "public"."coupons" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete coupons"
  ON "public"."coupons" FOR DELETE TO authenticated
  USING (public.is_admin());

-- user_coupons
CREATE POLICY "Admins can view all user coupons"
  ON "public"."user_coupons" FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert user coupons"
  ON "public"."user_coupons" FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user coupons"
  ON "public"."user_coupons" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- orders
CREATE POLICY "Admins can view all orders"
  ON "public"."orders" FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update order status"
  ON "public"."orders" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- order_items
CREATE POLICY "Admins can view all order items"
  ON "public"."order_items" FOR SELECT TO authenticated
  USING (public.is_admin());

-- claims
CREATE POLICY "Admins can view all claims"
  ON "public"."claims" FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update claim status"
  ON "public"."claims" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- inquiries
CREATE POLICY "Admins can view all inquiries"
  ON "public"."inquiries" FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can answer inquiries"
  ON "public"."inquiries" FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND status = '답변완료' AND answer IS NOT NULL AND answer_date IS NOT NULL);
