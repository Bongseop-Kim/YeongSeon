-- Admin UPDATE RLS for pricing tables

CREATE POLICY "admin_update_pricing_constants"
  ON custom_order_pricing_constants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_fabric_prices"
  ON custom_order_fabric_prices FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
