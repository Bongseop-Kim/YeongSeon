-- ============================================================= 
-- 96_functions_quotes.sql  – Quote request RPC functions 
-- =============================================================
-- ── create_quote_request_txn ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_quote_request_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_image_urls text[] DEFAULT '{}'::text[],
  p_additional_notes text DEFAULT '',
  p_contact_name text DEFAULT '',
  p_contact_title text DEFAULT '',
  p_contact_method text DEFAULT 'phone',
  p_contact_value text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_quote_id uuid;
  v_quote_number text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Quantity validation
  if p_quantity is null or p_quantity < 100 then
    raise exception 'Quantity must be 100 or more';
  end if;

  -- Shipping address validation
  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  -- Contact field validation
  if p_contact_name is null or trim(p_contact_name) = '' then
    raise exception 'Contact name is required';
  end if;

  if p_contact_method is null or p_contact_method not in ('email', 'kakao', 'phone') then
    raise exception 'Invalid contact method';
  end if;

  if p_contact_value is null or trim(p_contact_value) = '' then
    raise exception 'Contact value is required';
  end if;

  -- Options validation
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  v_quote_number := public.generate_quote_number();

  insert into public.quote_requests (
    user_id,
    quote_number,
    shipping_address_id,
    options,
    quantity,
    reference_image_urls,
    additional_notes,
    contact_name,
    contact_title,
    contact_method,
    contact_value,
    status
  )
  values (
    v_user_id,
    v_quote_number,
    p_shipping_address_id,
    p_options,
    p_quantity,
    coalesce(p_reference_image_urls, '{}'::text[]),
    coalesce(p_additional_notes, ''),
    trim(p_contact_name),
    coalesce(trim(p_contact_title), ''),
    p_contact_method,
    trim(p_contact_value),
    '요청'
  )
  returning id into v_quote_id;

  return jsonb_build_object(
    'quote_request_id', v_quote_id,
    'quote_number', v_quote_number
  );
end;
$$;

-- ── admin_update_quote_request_status ─────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_quote_request_status(
  p_quote_request_id uuid,
  p_new_status text,
  p_quoted_amount integer DEFAULT NULL,
  p_quote_conditions text DEFAULT NULL,
  p_admin_memo text DEFAULT NULL,
  p_memo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_current_status text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status
  select qr.status
  into v_current_status
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if not found then
    raise exception 'Quote request not found';
  end if;

  -- Validate new status
  if p_new_status is null or p_new_status not in ('요청', '견적발송', '협의중', '확정', '종료') then
    raise exception 'Invalid status';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  -- Validate state transition
  if not (
    (v_current_status = '요청'     and p_new_status in ('견적발송', '종료'))
    or (v_current_status = '견적발송' and p_new_status in ('협의중', '종료'))
    or (v_current_status = '협의중'   and p_new_status in ('확정', '종료'))
  ) then
    raise exception 'Invalid transition from "%" to "%"', v_current_status, p_new_status;
  end if;

  -- Validate quoted_amount is non-negative
  if p_quoted_amount is not null and p_quoted_amount < 0 then
    raise exception 'Quoted amount must be non-negative';
  end if;

  -- Update quote request
  update public.quote_requests
  set
    status = p_new_status,
    quoted_amount = coalesce(p_quoted_amount, quoted_amount),
    quote_conditions = coalesce(p_quote_conditions, quote_conditions),
    admin_memo = coalesce(p_admin_memo, admin_memo)
  where id = p_quote_request_id;

  -- Insert status log
  insert into public.quote_request_status_logs (
    quote_request_id,
    changed_by,
    previous_status,
    new_status,
    memo
  )
  values (
    p_quote_request_id,
    v_admin_id,
    v_current_status,
    p_new_status,
    p_memo
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;

