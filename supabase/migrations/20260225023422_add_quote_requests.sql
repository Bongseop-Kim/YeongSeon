set check_function_bodies = off;

-- =============================================================
-- quote_requests table
-- =============================================================

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL,
  quote_number         varchar(50) NOT NULL,
  shipping_address_id  uuid        NOT NULL,
  options              jsonb       NOT NULL,
  quantity             integer     NOT NULL,
  reference_image_urls text[]      NOT NULL DEFAULT '{}'::text[],
  additional_notes     text        NOT NULL DEFAULT '',
  contact_name         varchar     NOT NULL,
  contact_title        varchar     NOT NULL DEFAULT '',
  contact_method       text        NOT NULL,
  contact_value        varchar     NOT NULL,
  status               text        NOT NULL DEFAULT '요청',
  quoted_amount        integer,
  quote_conditions     text,
  admin_memo           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz,

  CONSTRAINT quote_requests_pkey PRIMARY KEY (id),
  CONSTRAINT quote_requests_quote_number_key UNIQUE (quote_number),
  CONSTRAINT quote_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT quote_requests_shipping_address_id_fkey
    FOREIGN KEY (shipping_address_id) REFERENCES public.shipping_addresses (id),
  CONSTRAINT quote_requests_quantity_check
    CHECK (quantity >= 100),
  CONSTRAINT quote_requests_contact_method_check
    CHECK (contact_method IN ('email', 'kakao', 'phone')),
  CONSTRAINT quote_requests_status_check
    CHECK (status IN ('요청', '견적발송', '협의중', '확정', '종료'))
);

CREATE INDEX idx_quote_requests_user_id ON public.quote_requests USING btree (user_id);
CREATE INDEX idx_quote_requests_status ON public.quote_requests USING btree (status);
CREATE INDEX idx_quote_requests_created_at ON public.quote_requests USING btree (created_at DESC);

CREATE TRIGGER set_quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quote requests"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quote requests"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quote requests"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all quote requests"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE UPDATE ON TABLE public.quote_requests FROM authenticated;
GRANT UPDATE (status, quoted_amount, quote_conditions, admin_memo, updated_at) ON TABLE public.quote_requests TO authenticated;

-- =============================================================
-- quote_request_status_logs table
-- =============================================================

CREATE TABLE IF NOT EXISTS public.quote_request_status_logs (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  quote_request_id  uuid        NOT NULL,
  changed_by        uuid        NOT NULL,
  previous_status   text        NOT NULL,
  new_status        text        NOT NULL,
  memo              text,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT quote_request_status_logs_pkey PRIMARY KEY (id),
  CONSTRAINT quote_request_status_logs_quote_request_id_fkey
    FOREIGN KEY (quote_request_id) REFERENCES public.quote_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT quote_request_status_logs_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_quote_request_status_logs_quote_request_id
  ON public.quote_request_status_logs USING btree (quote_request_id, created_at DESC);

ALTER TABLE public.quote_request_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of their own quote requests"
  ON public.quote_request_status_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all status logs"
  ON public.quote_request_status_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert status logs"
  ON public.quote_request_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- =============================================================
-- Functions
-- =============================================================

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  quote_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');
  perform pg_advisory_xact_lock(hashtext('QUO' || date_str));

  select coalesce(max(cast(substring(quote_number from 14) as integer)), 0) + 1
  into seq_num
  from quote_requests
  where quote_number like 'QUO-' || date_str || '-%';

  quote_num := 'QUO-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return quote_num;
end;
$$;

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

  if p_contact_method is null or p_contact_method not in ('email', 'kakao', 'phone') then
    raise exception 'Invalid contact method';
  end if;

  if p_contact_value is null or trim(p_contact_value) = '' then
    raise exception 'Contact value is required';
  end if;

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

  select qr.status
  into v_current_status
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if not found then
    raise exception 'Quote request not found';
  end if;

  if p_new_status is null or p_new_status not in ('요청', '견적발송', '협의중', '확정', '종료') then
    raise exception 'Invalid status';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  update public.quote_requests
  set
    status = p_new_status,
    quoted_amount = coalesce(p_quoted_amount, quoted_amount),
    quote_conditions = coalesce(p_quote_conditions, quote_conditions),
    admin_memo = coalesce(p_admin_memo, admin_memo)
  where id = p_quote_request_id;

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

-- =============================================================
-- Views
-- =============================================================

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
  qr.contact_title   AS "contactTitle",
  qr.contact_method  AS "contactMethod",
  qr.contact_value   AS "contactValue",
  qr.created_at,
  qr.updated_at,
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
  qr.reference_image_urls AS "referenceImageUrls",
  qr.additional_notes     AS "additionalNotes",
  qr.contact_name    AS "contactName",
  qr.contact_title   AS "contactTitle",
  qr.contact_method  AS "contactMethod",
  qr.contact_value   AS "contactValue",
  qr.quoted_amount   AS "quotedAmount",
  qr.quote_conditions AS "quoteConditions",
  qr.admin_memo      AS "adminMemo",
  qr.created_at,
  qr.updated_at,
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
