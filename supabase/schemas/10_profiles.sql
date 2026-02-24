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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
