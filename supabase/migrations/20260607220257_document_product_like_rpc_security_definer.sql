CREATE OR REPLACE FUNCTION public.product_is_liked_rpc(p_id integer)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  select exists (
    select 1
    from public.product_likes pl
    where pl.product_id = p_id
      and pl.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.product_like_counts_rpc()
  IS 'SECURITY DEFINER is required to expose aggregate product like counts publicly while product_likes rows remain protected by RLS.';

COMMENT ON FUNCTION public.product_is_liked_rpc(integer)
  IS 'SECURITY INVOKER keeps product_likes RLS active while returning whether the current caller liked the product.';

COMMENT ON FUNCTION public.admin_get_email(uuid)
  IS 'SECURITY DEFINER is required to read auth.users.email for admin views while returning data only when auth.uid() is an admin.';

COMMENT ON FUNCTION public.is_admin()
  IS 'SECURITY DEFINER is required to check profiles.role from RLS policies and admin-only RPCs without recursive policy evaluation.';

REVOKE ALL ON FUNCTION public.product_like_counts_rpc() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.product_like_counts_rpc() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.product_is_liked_rpc(integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.product_is_liked_rpc(integer) TO anon, authenticated;
