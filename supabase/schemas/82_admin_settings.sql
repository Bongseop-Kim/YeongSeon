-- =============================================================
-- 82_admin_settings.sql  –  Admin settings (key-value store)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key         text        NOT NULL,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid,

  CONSTRAINT admin_settings_pkey PRIMARY KEY (key),
  CONSTRAINT admin_settings_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Trigger
CREATE OR REPLACE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert settings"
  ON public.admin_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update settings"
  ON public.admin_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
