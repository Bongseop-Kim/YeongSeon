CREATE OR REPLACE FUNCTION public.upsert_shipping_address(
  p_recipient_name text,
  p_recipient_phone text,
  p_address text,
  p_postal_code text,
  p_is_default boolean,
  p_id uuid DEFAULT NULL,
  p_address_detail text DEFAULT NULL,
  p_delivery_request text DEFAULT NULL,
  p_delivery_memo text DEFAULT NULL
)
RETURNS SETOF public.shipping_addresses
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Serialize per-user writes so default-address toggles cannot interleave.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text)::bigint);

  v_id := coalesce(p_id, gen_random_uuid());

  if p_is_default then
    update public.shipping_addresses
    set is_default = false
    where user_id = v_user_id
      and id != v_id;
  end if;

  if p_id is null then
    insert into public.shipping_addresses (
      id,
      user_id,
      recipient_name,
      recipient_phone,
      address,
      address_detail,
      postal_code,
      delivery_request,
      delivery_memo,
      is_default
    )
    values (
      v_id,
      v_user_id,
      p_recipient_name,
      p_recipient_phone,
      p_address,
      p_address_detail,
      p_postal_code,
      p_delivery_request,
      p_delivery_memo,
      p_is_default
    );
  else
    update public.shipping_addresses
    set recipient_name = p_recipient_name,
        recipient_phone = p_recipient_phone,
        address = p_address,
        address_detail = p_address_detail,
        postal_code = p_postal_code,
        delivery_request = p_delivery_request,
        delivery_memo = p_delivery_memo,
        is_default = p_is_default
    where id = v_id
      and user_id = v_user_id;

    if not found then
      raise exception 'Shipping address not found';
    end if;
  end if;

  return query
  select *
  from public.shipping_addresses
  where id = v_id;
end;
$$;
