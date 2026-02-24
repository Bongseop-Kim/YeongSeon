-- 1. admin_get_email: auth.uid() 가드 추가 + search_path 구문 통일
CREATE OR REPLACE FUNCTION public.admin_get_email(uid uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND public.is_admin()
    THEN (SELECT email FROM auth.users WHERE id = uid)
    ELSE NULL
  END;
$function$;

-- 2. admin_user_coupon_view: phone PII 가드 + WHERE is_admin() 추가
CREATE OR REPLACE VIEW public.admin_user_coupon_view
WITH (security_invoker = true)
AS
SELECT
  uc.id,
  uc.user_id       AS "userId",
  uc.coupon_id     AS "couponId",
  uc.status,
  uc.issued_at     AS "issuedAt",
  uc.expires_at    AS "expiresAt",
  uc.used_at       AS "usedAt",
  p.name           AS "userName",
  CASE WHEN public.is_admin() THEN p.phone ELSE NULL END AS "userPhone",
  public.admin_get_email(uc.user_id) AS "userEmail"
FROM public.user_coupons uc
LEFT JOIN public.profiles p ON p.id = uc.user_id
WHERE public.is_admin();

-- 3. user_coupons 중복 발급 방지 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS user_coupons_user_coupon_uniq
  ON public.user_coupons (user_id, coupon_id);
