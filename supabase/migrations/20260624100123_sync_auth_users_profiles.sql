CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'nickname'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    '사용자'
  );

  INSERT INTO public.profiles (id, name, phone, role, is_active, birth)
  VALUES (NEW.id, v_name, NULL, 'customer'::public.user_role, true, NULL)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user_profile()
  IS 'SECURITY DEFINER is required so the auth.users insert trigger can create the matching public.profiles row while profiles RLS and authenticated insert policies remain enforced for client callers.';

DROP TRIGGER IF EXISTS trg_handle_new_auth_user_profile ON auth.users;

CREATE TRIGGER trg_handle_new_auth_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

INSERT INTO public.profiles (id, name, phone, role, is_active, birth)
SELECT
  u.id,
  COALESCE(
    NULLIF(BTRIM(u.raw_user_meta_data->>'name'), ''),
    NULLIF(BTRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(BTRIM(u.raw_user_meta_data->>'nickname'), ''),
    NULLIF(split_part(u.email, '@', 1), ''),
    '사용자'
  ),
  NULL,
  'customer'::public.user_role,
  true,
  NULL
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
