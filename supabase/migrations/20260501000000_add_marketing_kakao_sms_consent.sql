-- profiles 테이블에 마케팅 동의 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_kakao_sms_consent boolean NOT NULL DEFAULT false;

-- 기존 user_metadata 마케팅 SMS 동의 데이터 백필
UPDATE public.profiles p
SET marketing_kakao_sms_consent = COALESCE(
  (
    SELECT (raw_user_meta_data->'marketingConsent'->'channels'->>'sms')::boolean
    FROM auth.users
    WHERE id = p.id
  ),
  false
);

-- marketing_kakao_sms_consent 컬럼 UPDATE 권한 부여
GRANT UPDATE (marketing_kakao_sms_consent) ON TABLE public.profiles TO authenticated;

-- set_marketing_consent RPC
-- SECURITY INVOKER: profiles RLS(id = auth.uid())가 소유권을 보장하며,
-- audit log가 불필요하므로 INVOKER로 충분하다.
CREATE OR REPLACE FUNCTION public.set_marketing_consent(
  p_kakao_sms_consent boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET marketing_kakao_sms_consent = p_kakao_sms_consent
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_marketing_consent(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_marketing_consent(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_marketing_consent(boolean) TO service_role;
