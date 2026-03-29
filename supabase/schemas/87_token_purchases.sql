-- =============================================================
-- 87_token_purchases.sql  –  Token purchase ledger (DEPRECATED)
-- 데이터는 20260313000000_integrate_token_into_orders 마이그레이션으로
-- orders/order_items 테이블로 이관되었습니다.
-- 새 쓰기는 create_token_order RPC를 통해 orders 테이블에 기록됩니다.
-- 이 테이블은 레거시 데이터 보존 목적으로 유지됩니다.
-- =============================================================

CREATE TABLE public.token_purchases (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_group_id  uuid        NOT NULL UNIQUE,
  plan_key          text        NOT NULL CHECK (plan_key IN ('starter','popular','pro')),
  token_amount      integer     NOT NULL CHECK (token_amount > 0),
  price             integer     NOT NULL CHECK (price > 0),
  status            text        NOT NULL DEFAULT '대기중'
                    CHECK (status IN ('대기중','결제중','완료','실패')),
  payment_key       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_purchases_user_id ON public.token_purchases (user_id, created_at DESC);

-- RLS: 사용자는 자기 것만 SELECT, INSERT/UPDATE는 RPC 전용
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token purchases"
  ON public.token_purchases FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
