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
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT claims_pkey PRIMARY KEY (id),
  CONSTRAINT claims_claim_number_key UNIQUE (claim_number),
  CONSTRAINT claims_type_check
    CHECK (type = ANY (ARRAY['cancel','return','exchange'])),
  CONSTRAINT claims_status_check
    CHECK (status = ANY (ARRAY['접수','처리중','완료','거부'])),
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
  WHERE status = ANY (ARRAY['접수','처리중']);

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
