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
  phone_verified        boolean     NOT NULL DEFAULT false,
  notification_consent  boolean     NOT NULL DEFAULT false,
  notification_enabled  boolean     NOT NULL DEFAULT true,

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone      varchar     NOT NULL,
  code       varchar(6)  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified   boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS phone_verifications_user_id_idx
  ON public.phone_verifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preference_logs (
  id                             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_notification_consent  boolean     NOT NULL,
  new_notification_consent       boolean     NOT NULL,
  previous_notification_enabled  boolean     NOT NULL,
  new_notification_enabled       boolean     NOT NULL,
  created_at                     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_preference_logs_user_id_idx
  ON public.notification_preference_logs (user_id, created_at DESC);

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
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preference_logs ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view their own phone verifications"
  ON public.phone_verifications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage phone verifications"
  ON public.phone_verifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own notification preference logs"
  ON public.notification_preference_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can view all notification preference logs"
  ON public.notification_preference_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Privilege hardening
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (name, phone, birth) ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.phone_verifications TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.phone_verifications FROM authenticated;
