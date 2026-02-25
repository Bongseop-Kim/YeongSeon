-- =============================================================
-- 83_quote_requests.sql  –  Quote request management
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
  quoted_amount        integer     CONSTRAINT quote_requests_quoted_amount_nonneg CHECK (quoted_amount >= 0),
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

-- Trigger: auto-update updated_at
CREATE TRIGGER set_quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quote requests"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quote requests"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.shipping_addresses sa
      WHERE sa.id = shipping_address_id
        AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all quote requests"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all quote requests"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Privilege hardening: admins can only update specific columns
REVOKE UPDATE ON TABLE public.quote_requests FROM authenticated;
GRANT UPDATE (status, quoted_amount, quote_conditions, admin_memo) ON TABLE public.quote_requests TO authenticated;

-- =============================================================
-- quote_request_status_logs  –  Status change audit trail
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

-- RLS
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
  WITH CHECK (public.is_admin() AND changed_by = auth.uid());
