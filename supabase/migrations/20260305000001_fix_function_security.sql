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


CREATE OR REPLACE FUNCTION public.replace_product_options(
  p_product_id integer,
  p_options     jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.product_options
  WHERE product_id = p_product_id;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'p_options must be a JSON array';
  END IF;

  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO public.product_options
      (product_id, option_id, name, additional_price, stock)
    SELECT
      p_product_id,
      (elem->>'option_id')::varchar(50),
      (elem->>'name')::varchar(255),
      (elem->>'additional_price')::integer,
      CASE WHEN elem->>'stock' IS NULL THEN NULL
           ELSE (elem->>'stock')::integer END
    FROM jsonb_array_elements(p_options) AS elem;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.auto_confirm_delivered_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order  record;
  v_points integer;
  v_count  integer := 0;
begin
  -- Only allow pg_cron / service_role (no authenticated user session)
  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'unauthorized: scheduler-only function';
  end if;

  for v_order in
    select id, user_id, total_price
    from public.orders
    where status = '배송완료'
      and delivered_at <= now() - interval '7 days'
    for update skip locked
  loop
    v_points := floor(v_order.total_price * 0.005);

    update public.orders
    set status       = '완료',
        confirmed_at = now()
    where id = v_order.id;

    if v_points > 0 then
      insert into public.points (user_id, order_id, amount, type, description)
      values (
        v_order.user_id,
        v_order.id,
        v_points,
        'earn',
        '구매확정 포인트 적립 (자동 확정, 0.5%)'
      );
    end if;

    -- Audit log (changed_by = NULL indicates automated system action)
    insert into public.order_status_logs (
      order_id,
      changed_by,
      previous_status,
      new_status,
      memo
    )
    values (
      v_order.id,
      NULL,
      '배송완료',
      '완료',
      '자동 구매확정 (배송완료 후 7일 경과)'
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'confirmed_count', v_count
  );
end;
$$;
