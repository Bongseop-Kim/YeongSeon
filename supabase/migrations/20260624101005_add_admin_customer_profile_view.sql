CREATE OR REPLACE VIEW public.admin_customer_profile_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.name,
  p.phone,
  public.admin_get_email(p.id) AS email,
  p.role,
  p.is_active,
  p.created_at,
  p.birth
FROM public.profiles p
WHERE public.is_admin();

GRANT SELECT ON public.admin_customer_profile_view TO authenticated, service_role;
