-- =============================================================
-- 10_profiles.sql  –  User profiles
-- =============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  name       varchar     NOT NULL,
  phone      varchar,
  role       public.user_role NOT NULL DEFAULT 'customer',
  is_active  boolean     NOT NULL DEFAULT true,
  birth      date,

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- Admin role check (SECURITY DEFINER bypasses RLS to avoid infinite recursion on profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin'::public.user_role, 'manager'::public.user_role)
  );
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role = 'customer'
    AND is_active = true
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
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

-- Admin policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Privilege hardening
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (name, phone, birth) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (role, is_active) ON TABLE public.profiles TO authenticated;
