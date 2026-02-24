-- admin_get_email: Returns auth.users.email for admins only
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_get_email(uid uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.is_admin()
    THEN (SELECT email FROM auth.users WHERE id = uid)
    ELSE NULL
  END;
$function$;

-- admin_user_coupon_view: Join user_coupons with profiles + email
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
  p.phone          AS "userPhone",
  public.admin_get_email(uc.user_id) AS "userEmail"
FROM public.user_coupons uc
LEFT JOIN public.profiles p ON p.id = uc.user_id;
