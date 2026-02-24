-- =============================================================
-- 11_shipping_addresses.sql  –  Shipping addresses
-- =============================================================

CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  recipient_name   varchar     NOT NULL,
  recipient_phone  varchar     NOT NULL,
  address          text        NOT NULL,
  is_default       boolean     NOT NULL,
  user_id          uuid        NOT NULL,
  postal_code      varchar     NOT NULL,
  delivery_memo    text,
  address_detail   varchar,
  delivery_request text,

  CONSTRAINT shipping_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_addresses_user_id_fkey1
    FOREIGN KEY (user_id) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- RLS
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable users to view their own data only"
  ON public.shipping_addresses FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Enable insert for users based on user_id"
  ON public.shipping_addresses FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON public.shipping_addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON public.shipping_addresses FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- Admin policies
CREATE POLICY "Admins can view all shipping addresses"
  ON public.shipping_addresses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin'::public.user_role, 'manager'::public.user_role)
    )
  );
