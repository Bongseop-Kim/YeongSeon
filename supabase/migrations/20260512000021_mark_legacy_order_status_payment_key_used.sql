create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text,
  p_payment_key text,
  p_is_rollback boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  perform p_payment_key;

  return public.admin_update_order_status(
    p_order_id,
    p_new_status,
    p_memo,
    p_is_rollback
  );
end;
$$;

comment on function public.admin_update_order_status(uuid, text, text, text, boolean)
  is 'SECURITY DEFINER is required for legacy positional callers that still pass the deprecated p_payment_key placeholder while admin access remains restricted by public.is_admin() in the canonical function. Deprecated: placeholder p_payment_key retained for legacy positional callers; scheduled for removal in the next major release.';

grant execute on function public.admin_update_order_status(uuid, text, text, text, boolean) to authenticated, service_role;
