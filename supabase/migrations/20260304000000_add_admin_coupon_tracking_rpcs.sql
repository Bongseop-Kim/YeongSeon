-- ── admin_update_order_tracking ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_order_tracking(
  p_order_id uuid,
  p_courier_company text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_tracking_number text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_tracking_number := nullif(trim(p_tracking_number), '');

  update public.orders
  set
    courier_company = nullif(trim(p_courier_company), ''),
    tracking_number = v_tracking_number,
    shipped_at = case
      when v_tracking_number is not null then coalesce(shipped_at, now())
      else shipped_at
    end
  where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$$;

-- ── admin_bulk_issue_coupons ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_bulk_issue_coupons(
  p_coupon_id uuid,
  p_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  with target_user_ids as (
    select distinct t.user_id
    from unnest(p_user_ids) as t(user_id)
    where t.user_id is not null
  ),
  upserted as (
    insert into public.user_coupons (user_id, coupon_id, status)
    select user_id, p_coupon_id, 'active'
    from target_user_ids
    on conflict (user_id, coupon_id)
    do update set status = excluded.status
    returning 1
  )
  select count(*)
  into v_affected_count
  from upserted;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;

-- ── admin_revoke_coupons_by_ids ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_coupons_by_ids(
  p_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  update public.user_coupons
  set status = 'revoked'
  where id = any(p_ids)
    and status = 'active';

  get diagnostics v_affected_count = row_count;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;

-- ── admin_revoke_coupons_by_user_ids ────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_coupons_by_user_ids(
  p_coupon_id uuid,
  p_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  update public.user_coupons
  set status = 'revoked'
  where coupon_id = p_coupon_id
    and user_id = any(p_user_ids)
    and status = 'active';

  get diagnostics v_affected_count = row_count;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;
