-- =============================================================
-- 52_repair_shipping.sql  –  수선품 발송 부가 정보
--   - repair_pickup_requests : 방문 수거 신청 (결제 전 주문 생성 시에만)
--   - repair_shipping_receipts: 발송 접수 기록 (송장 사진 / 송장 없는 접수)
-- =============================================================

-- ── repair_pickup_requests ────────────────────────────────────
-- 수선 주문의 방문 수거 신청 정보. create_order_txn(SECURITY DEFINER)만 INSERT.
-- pickup_fee는 신청 시점의 REFORM_PICKUP_FEE 스냅샷.
CREATE TABLE IF NOT EXISTS public.repair_pickup_requests (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id        uuid        NOT NULL,
  recipient_name  text        NOT NULL,
  recipient_phone text        NOT NULL,
  postal_code     text,
  address         text        NOT NULL,
  detail_address  text,
  pickup_fee      integer     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT repair_pickup_requests_pkey PRIMARY KEY (id),
  CONSTRAINT repair_pickup_requests_order_id_key UNIQUE (order_id),
  CONSTRAINT repair_pickup_requests_fee_check CHECK (pickup_fee >= 0),
  CONSTRAINT repair_pickup_requests_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE CASCADE
);

ALTER TABLE public.repair_pickup_requests ENABLE ROW LEVEL SECURITY;

-- 주문 소유자 조회
CREATE POLICY "repair_pickup_requests_owner_select"
  ON public.repair_pickup_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = (SELECT auth.uid())
    )
  );

-- 관리자 조회
CREATE POLICY "repair_pickup_requests_admin_select"
  ON public.repair_pickup_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── repair_shipping_receipts ──────────────────────────────────
-- 고객의 수선품 발송 접수 기록.
--   tracking     : 송장 등록 시 첨부 사진이 있을 때만 생성
--   no_tracking  : 송장 없는 접수(사유 필수) — 주문 상태 '발송확인중'으로 전이
-- photos: [{ "url": text, "fileId": text }] (ImageKit)
CREATE TABLE IF NOT EXISTS public.repair_shipping_receipts (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id     uuid        NOT NULL,
  receipt_type text        NOT NULL,
  reason       text,
  memo         text,
  photos       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT repair_shipping_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT repair_shipping_receipts_type_check
    CHECK (receipt_type IN ('tracking', 'no_tracking')),
  CONSTRAINT repair_shipping_receipts_reason_check
    CHECK (reason IS NULL OR reason IN ('quick', 'overseas', 'lost')),
  CONSTRAINT repair_shipping_receipts_no_tracking_reason_check
    CHECK (receipt_type <> 'no_tracking' OR reason IS NOT NULL),
  CONSTRAINT repair_shipping_receipts_memo_length_check
    CHECK (memo IS NULL OR char_length(memo) <= 500),
  CONSTRAINT repair_shipping_receipts_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE CASCADE
);

CREATE INDEX idx_repair_shipping_receipts_order_id
  ON public.repair_shipping_receipts (order_id);

ALTER TABLE public.repair_shipping_receipts ENABLE ROW LEVEL SECURITY;

-- 주문 소유자 조회
CREATE POLICY "repair_shipping_receipts_owner_select"
  ON public.repair_shipping_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = (SELECT auth.uid())
    )
  );

-- 관리자 조회
CREATE POLICY "repair_shipping_receipts_admin_select"
  ON public.repair_shipping_receipts FOR SELECT
  TO authenticated
  USING (public.is_admin());
