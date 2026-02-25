-- =============================================================
-- 60_claims.sql  –  Claims (cancel / return / exchange)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.claims (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL,
  order_id       uuid        NOT NULL,
  order_item_id  uuid        NOT NULL,
  claim_number   varchar(50) NOT NULL,
  type           text        NOT NULL,
  status         text        NOT NULL DEFAULT '접수',
  reason         text        NOT NULL,
  description    text,
  quantity       integer     NOT NULL,
  return_courier_company  text,
  return_tracking_number  text,
  resend_courier_company  text,
  resend_tracking_number  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT claims_pkey PRIMARY KEY (id),
  CONSTRAINT claims_claim_number_key UNIQUE (claim_number),
  CONSTRAINT claims_type_check
    CHECK (type = ANY (ARRAY['cancel','return','exchange'])),
  CONSTRAINT claims_status_check
    CHECK (status = ANY (ARRAY['접수','처리중','수거요청','수거완료','재발송','완료','거부'])),
  CONSTRAINT claims_reason_check
    CHECK (reason = ANY (ARRAY[
      'change_mind','defect','delay','wrong_item',
      'size_mismatch','color_mismatch','other'
    ])),
  CONSTRAINT claims_quantity_check CHECK (quantity > 0),
  CONSTRAINT claims_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT claims_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders (id),
  CONSTRAINT claims_order_item_id_fkey
    FOREIGN KEY (order_item_id) REFERENCES public.order_items (id)
);

-- Indexes
CREATE INDEX idx_claims_user_id       ON public.claims USING btree (user_id);
CREATE INDEX idx_claims_order_id      ON public.claims USING btree (order_id);
CREATE INDEX idx_claims_order_item_id ON public.claims USING btree (order_item_id);
CREATE INDEX idx_claims_status        ON public.claims USING btree (status);
CREATE UNIQUE INDEX idx_claims_active_per_item
  ON public.claims USING btree (order_item_id, type)
  WHERE status = ANY (ARRAY['접수','처리중','수거요청','수거완료','재발송']);

-- Trigger
CREATE OR REPLACE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own claims"
  ON public.claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update claim status"
  ON public.claims FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Privilege hardening
REVOKE UPDATE ON TABLE public.claims FROM authenticated;
GRANT UPDATE (status, return_courier_company, return_tracking_number,
              resend_courier_company, resend_tracking_number)
  ON TABLE public.claims TO authenticated;

-- =============================================================
-- claim_status_logs  –  Status change audit trail
-- =============================================================

CREATE TABLE IF NOT EXISTS public.claim_status_logs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  claim_id        uuid        NOT NULL,
  changed_by      uuid,
  previous_status text        NOT NULL,
  new_status      text        NOT NULL,
  memo            text,
  is_rollback     boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT claim_status_logs_pkey PRIMARY KEY (id),
  CONSTRAINT claim_status_logs_claim_id_fkey
    FOREIGN KEY (claim_id) REFERENCES public.claims (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT claim_status_logs_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_claim_status_logs_claim_id
  ON public.claim_status_logs USING btree (claim_id, created_at DESC);

-- RLS
ALTER TABLE public.claim_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of their own claims"
  ON public.claim_status_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all claim status logs"
  ON public.claim_status_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert claim status logs"
  ON public.claim_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND changed_by = auth.uid());
