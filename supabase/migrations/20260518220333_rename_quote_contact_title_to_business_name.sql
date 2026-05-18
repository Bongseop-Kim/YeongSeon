DROP VIEW IF EXISTS public.admin_quote_request_detail_view;
DROP VIEW IF EXISTS public.admin_quote_request_list_view;
DROP VIEW IF EXISTS public.quote_request_detail_view;
DROP VIEW IF EXISTS public.quote_request_list_view;

ALTER TABLE public.quote_requests
  RENAME COLUMN contact_title TO business_name;

ALTER TABLE public.quote_requests
  DROP CONSTRAINT IF EXISTS quote_requests_contact_method_check;

UPDATE public.quote_requests
SET contact_method = 'email'
WHERE contact_method = 'kakao';

ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_contact_method_check
  CHECK (contact_method IN ('email', 'phone'));

DROP FUNCTION IF EXISTS public.create_quote_request_txn(uuid, jsonb, integer, jsonb, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_quote_request_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_images jsonb DEFAULT '[]'::jsonb,
  p_additional_notes text DEFAULT '',
  p_contact_name text DEFAULT '',
  p_business_name text DEFAULT '',
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
  v_elem jsonb;
  v_idx integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_quantity is null or p_quantity < 100 then
    raise exception 'Quantity must be 100 or more';
  end if;

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

  if p_contact_name is null or trim(p_contact_name) = '' then
    raise exception 'Contact name is required';
  end if;

  if p_contact_method is null or p_contact_method not in ('email', 'phone') then
    raise exception 'Invalid contact method';
  end if;

  if p_contact_value is null or trim(p_contact_value) = '' then
    raise exception 'Contact value is required';
  end if;

  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  if p_reference_images is not null and jsonb_typeof(p_reference_images) <> 'array' then
    raise exception 'p_reference_images must be a JSON array';
  end if;

  v_idx := 0;
  if p_reference_images is not null then
    for v_elem in select jsonb_array_elements(p_reference_images) loop
      if jsonb_typeof(v_elem) <> 'object'
         or not (v_elem ? 'url')
         or jsonb_typeof(v_elem->'url') <> 'string'
         or btrim(coalesce(v_elem->>'url', '')) = ''
         or ((v_elem ? 'file_id') and jsonb_typeof(v_elem->'file_id') not in ('string', 'null')) then
        raise exception 'p_reference_images[%] must be an object with a non-empty string "url" and optional string/null "file_id"', v_idx;
      end if;
      v_idx := v_idx + 1;
    end loop;
  end if;

  v_quote_number := public.generate_quote_number();

  insert into public.quote_requests (
    user_id,
    quote_number,
    shipping_address_id,
    options,
    quantity,
    reference_images,
    additional_notes,
    contact_name,
    business_name,
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
    coalesce(p_reference_images, '[]'::jsonb),
    coalesce(p_additional_notes, ''),
    trim(p_contact_name),
    coalesce(trim(p_business_name), ''),
    p_contact_method,
    trim(p_contact_value),
    '요청'
  )
  returning id into v_quote_id;

  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/custom-orders',
      'quote_request',
      v_quote_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  return jsonb_build_object(
    'quote_request_id', v_quote_id,
    'quote_number', v_quote_number
  );
end;
$$;

CREATE OR REPLACE VIEW public.quote_request_list_view
WITH (security_invoker = true)
AS
SELECT
  qr.id,
  qr.quote_number    AS "quoteNumber",
  to_char(qr.created_at, 'YYYY-MM-DD') AS date,
  qr.status,
  qr.quantity,
  qr.quoted_amount   AS "quotedAmount",
  qr.contact_name    AS "contactName",
  qr.contact_method  AS "contactMethod",
  qr.created_at
FROM public.quote_requests qr
WHERE qr.user_id = auth.uid();

CREATE OR REPLACE VIEW public.quote_request_detail_view
WITH (security_invoker = true)
AS
SELECT
  qr.id,
  qr.quote_number        AS "quoteNumber",
  to_char(qr.created_at, 'YYYY-MM-DD') AS date,
  qr.status,
  qr.options,
  qr.quantity,
  qr.reference_images    AS "referenceImages",
  qr.additional_notes    AS "additionalNotes",
  qr.contact_name        AS "contactName",
  qr.business_name       AS "businessName",
  qr.contact_method      AS "contactMethod",
  qr.contact_value       AS "contactValue",
  qr.quoted_amount       AS "quotedAmount",
  qr.quote_conditions    AS "quoteConditions",
  qr.created_at
FROM public.quote_requests qr
WHERE qr.user_id = auth.uid();

CREATE OR REPLACE VIEW public.admin_quote_request_list_view
WITH (security_invoker = true)
AS
SELECT
  qr.id,
  qr.user_id        AS "userId",
  qr.quote_number    AS "quoteNumber",
  to_char(qr.created_at, 'YYYY-MM-DD') AS date,
  qr.status,
  qr.quantity,
  qr.quoted_amount   AS "quotedAmount",
  qr.contact_name    AS "contactName",
  qr.business_name   AS "businessName",
  qr.contact_method  AS "contactMethod",
  qr.contact_value   AS "contactValue",
  qr.created_at      AS "createdAt",
  qr.updated_at      AS "updatedAt",
  p.name             AS "customerName",
  p.phone            AS "customerPhone",
  public.admin_get_email(qr.user_id) AS "customerEmail"
FROM public.quote_requests qr
LEFT JOIN public.profiles p ON p.id = qr.user_id;

CREATE OR REPLACE VIEW public.admin_quote_request_detail_view
WITH (security_invoker = true)
AS
SELECT
  qr.id,
  qr.user_id        AS "userId",
  qr.quote_number    AS "quoteNumber",
  to_char(qr.created_at, 'YYYY-MM-DD') AS date,
  qr.status,
  qr.options,
  qr.quantity,
  qr.reference_images AS "referenceImages",
  qr.additional_notes     AS "additionalNotes",
  qr.contact_name    AS "contactName",
  qr.business_name   AS "businessName",
  qr.contact_method  AS "contactMethod",
  qr.contact_value   AS "contactValue",
  qr.quoted_amount   AS "quotedAmount",
  qr.quote_conditions AS "quoteConditions",
  qr.admin_memo      AS "adminMemo",
  qr.created_at      AS "createdAt",
  qr.updated_at      AS "updatedAt",
  p.name             AS "customerName",
  p.phone            AS "customerPhone",
  public.admin_get_email(qr.user_id) AS "customerEmail",
  sa.recipient_name   AS "recipientName",
  sa.recipient_phone  AS "recipientPhone",
  sa.address          AS "shippingAddress",
  sa.address_detail   AS "shippingAddressDetail",
  sa.postal_code      AS "shippingPostalCode",
  sa.delivery_memo    AS "deliveryMemo",
  sa.delivery_request AS "deliveryRequest"
FROM public.quote_requests qr
LEFT JOIN public.profiles p ON p.id = qr.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = qr.shipping_address_id;

GRANT SELECT ON public.quote_request_list_view TO anon, authenticated, service_role;
GRANT SELECT ON public.quote_request_detail_view TO anon, authenticated, service_role;
GRANT SELECT ON public.admin_quote_request_detail_view TO authenticated, service_role;
GRANT SELECT ON public.admin_quote_request_list_view TO authenticated, service_role;
GRANT ALL ON FUNCTION public.create_quote_request_txn(uuid, jsonb, integer, jsonb, text, text, text, text, text) TO anon;
GRANT ALL ON FUNCTION public.create_quote_request_txn(uuid, jsonb, integer, jsonb, text, text, text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.create_quote_request_txn(uuid, jsonb, integer, jsonb, text, text, text, text, text) TO service_role;
