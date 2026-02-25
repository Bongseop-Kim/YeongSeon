-- =============================================================
-- order_status_logs  –  Status change audit trail
-- =============================================================

CREATE TABLE public.order_status_logs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id        uuid        NOT NULL,
  changed_by      uuid        NOT NULL,
  previous_status text        NOT NULL,
  new_status      text        NOT NULL,
  memo            text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_status_logs_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_logs_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT order_status_logs_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_order_status_logs_order_id
  ON public.order_status_logs USING btree (order_id, created_at DESC);

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of their own orders"
  ON public.order_status_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order status logs"
  ON public.order_status_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert order status logs"
  ON public.order_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND changed_by = auth.uid());

-- =============================================================
-- claim_status_logs  –  Status change audit trail
-- =============================================================

CREATE TABLE public.claim_status_logs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  claim_id        uuid        NOT NULL,
  changed_by      uuid        NOT NULL,
  previous_status text        NOT NULL,
  new_status      text        NOT NULL,
  memo            text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT claim_status_logs_pkey PRIMARY KEY (id),
  CONSTRAINT claim_status_logs_claim_id_fkey
    FOREIGN KEY (claim_id) REFERENCES public.claims (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT claim_status_logs_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_claim_status_logs_claim_id
  ON public.claim_status_logs USING btree (claim_id, created_at DESC);

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

-- =============================================================
-- Views
-- =============================================================

CREATE OR REPLACE VIEW public.admin_order_status_log_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.order_id         AS "orderId",
  l.changed_by       AS "changedBy",
  l.previous_status  AS "previousStatus",
  l.new_status       AS "newStatus",
  l.memo,
  l.created_at       AS "createdAt"
FROM public.order_status_logs l;

CREATE OR REPLACE VIEW public.admin_claim_status_log_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.claim_id         AS "claimId",
  l.changed_by       AS "changedBy",
  l.previous_status  AS "previousStatus",
  l.new_status       AS "newStatus",
  l.memo,
  l.created_at       AS "createdAt"
FROM public.claim_status_logs l;

-- =============================================================
-- RPC: admin_update_order_status
-- =============================================================

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
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
  v_order_type text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select o.status, o.order_type
  into v_current_status, v_order_type
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if v_order_type = 'sale' then
    if not (
      (v_current_status = '대기중' and p_new_status = '진행중')
      or (v_current_status = '진행중' and p_new_status = '배송중')
      or (v_current_status = '배송중' and p_new_status = '완료')
      or (p_new_status = '취소' and v_current_status in ('대기중', '진행중', '배송중'))
    ) then
      raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
    end if;
  elsif v_order_type = 'custom' then
    if not (
      (v_current_status = '대기중' and p_new_status = '접수')
      or (v_current_status = '접수' and p_new_status = '제작중')
      or (v_current_status = '제작중' and p_new_status = '제작완료')
      or (v_current_status = '제작완료' and p_new_status = '배송중')
      or (v_current_status = '배송중' and p_new_status = '완료')
      or (p_new_status = '취소' and v_current_status in ('대기중', '접수'))
    ) then
      raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
    end if;
  elsif v_order_type = 'repair' then
    if not (
      (v_current_status = '대기중' and p_new_status = '접수')
      or (v_current_status = '접수' and p_new_status = '수선중')
      or (v_current_status = '수선중' and p_new_status = '수선완료')
      or (v_current_status = '수선완료' and p_new_status = '배송중')
      or (v_current_status = '배송중' and p_new_status = '완료')
      or (p_new_status = '취소' and v_current_status in ('대기중', '접수'))
    ) then
      raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
    end if;
  else
    raise exception 'Unknown order type: %', v_order_type;
  end if;

  if p_new_status = '배송중' then
    update public.orders
    set status = p_new_status,
        shipped_at = coalesce(shipped_at, now())
    where id = p_order_id;
  else
    update public.orders
    set status = p_new_status
    where id = p_order_id;
  end if;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  )
  values (
    p_order_id, v_admin_id, v_current_status, p_new_status, p_memo
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;

-- =============================================================
-- RPC: admin_update_claim_status
-- =============================================================

CREATE OR REPLACE FUNCTION public.admin_update_claim_status(
  p_claim_id uuid,
  p_new_status text,
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
  v_claim_type text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select c.status, c.type
  into v_current_status, v_claim_type
  from public.claims c
  where c.id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if v_claim_type = 'cancel' then
    if not (
      (v_current_status = '접수' and p_new_status = '처리중')
      or (v_current_status = '처리중' and p_new_status = '완료')
      or (p_new_status = '거부' and v_current_status in ('접수', '처리중'))
    ) then
      raise exception 'Invalid transition from "%" to "%" for cancel claim', v_current_status, p_new_status;
    end if;
  elsif v_claim_type = 'return' then
    if not (
      (v_current_status = '접수' and p_new_status = '수거요청')
      or (v_current_status = '수거요청' and p_new_status = '수거완료')
      or (v_current_status = '수거완료' and p_new_status = '완료')
      or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료'))
    ) then
      raise exception 'Invalid transition from "%" to "%" for return claim', v_current_status, p_new_status;
    end if;
  elsif v_claim_type = 'exchange' then
    if not (
      (v_current_status = '접수' and p_new_status = '수거요청')
      or (v_current_status = '수거요청' and p_new_status = '수거완료')
      or (v_current_status = '수거완료' and p_new_status = '재발송')
      or (v_current_status = '재발송' and p_new_status = '완료')
      or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료', '재발송'))
    ) then
      raise exception 'Invalid transition from "%" to "%" for exchange claim', v_current_status, p_new_status;
    end if;
  else
    raise exception 'Unknown claim type: %', v_claim_type;
  end if;

  update public.claims
  set status = p_new_status
  where id = p_claim_id;

  insert into public.claim_status_logs (
    claim_id, changed_by, previous_status, new_status, memo
  )
  values (
    p_claim_id, v_admin_id, v_current_status, p_new_status, p_memo
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;
