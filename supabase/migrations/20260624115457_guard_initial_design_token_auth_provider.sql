CREATE OR REPLACE FUNCTION public.grant_initial_design_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount integer;
  v_has_auth_provider boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = NEW.id
      AND (
        NULLIF(BTRIM(COALESCE(u.raw_app_meta_data->>'provider', '')), '') IS NOT NULL
        OR (
          jsonb_typeof(u.raw_app_meta_data->'providers') = 'array'
          AND jsonb_array_length(u.raw_app_meta_data->'providers') > 0
        )
      )
  )
  INTO v_has_auth_provider;

  IF NOT v_has_auth_provider THEN
    RETURN NEW;
  END IF;

  SELECT CASE
    WHEN value ~ '^[0-9]+$' AND value::integer >= 1 THEN value::integer
    ELSE 30
  END
  INTO v_amount
  FROM public.admin_settings
  WHERE key = 'design_token_initial_grant';

  IF v_amount IS NULL THEN
    v_amount := 30;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, token_class, description)
  VALUES (NEW.id, v_amount, 'grant', 'free', '신규 가입 토큰 지급');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.grant_initial_design_tokens()
  IS 'SECURITY DEFINER is required because design_tokens INSERT is RPC/trigger-only; the function grants initial signup tokens only for auth.users rows with Supabase Auth provider metadata.';
