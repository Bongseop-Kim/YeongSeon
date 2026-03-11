-- supabase/migrations/20260311100000_merge_token_refund_into_claims.sql

-- 1. claims.type CHECK에 token_refund 추가
ALTER TABLE public.claims DROP CONSTRAINT claims_type_check;
ALTER TABLE public.claims
  ADD CONSTRAINT claims_type_check
  CHECK (type IN ('cancel', 'return', 'exchange', 'token_refund'));

-- 2. claims_reason_check 수정: token_refund는 자유 텍스트 reason 허용
ALTER TABLE public.claims DROP CONSTRAINT claims_reason_check;
ALTER TABLE public.claims
  ADD CONSTRAINT claims_reason_check
  CHECK (
    type = 'token_refund'
    OR reason = ANY (ARRAY['change_mind','defect','delay','wrong_item','size_mismatch','color_mismatch','other'])
  );

-- 3. token 환불 전용 데이터 컬럼 추가
-- 구조: { "paid_token_amount": int, "bonus_token_amount": int, "refund_amount": int }
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS refund_data jsonb;

-- 4. token_refund_requests → claims 데이터 이전
INSERT INTO public.claims (
  user_id, order_id, order_item_id,
  claim_number, type, status,
  reason, description, quantity,
  refund_data, created_at, updated_at
)
SELECT
  trr.user_id,
  trr.order_id,
  (
    SELECT oi.id
    FROM public.order_items oi
    WHERE oi.order_id = trr.order_id
      AND oi.item_type = 'token'
    ORDER BY oi.created_at
    LIMIT 1
  ) AS order_item_id,
  'TKR-' || LPAD(
    CAST(ROW_NUMBER() OVER (ORDER BY trr.created_at) AS text),
    6, '0'
  ) AS claim_number,
  'token_refund' AS type,
  CASE trr.status
    WHEN 'pending'   THEN '접수'
    WHEN 'approved'  THEN '완료'
    WHEN 'rejected'  THEN '거부'
    WHEN 'cancelled' THEN '거부'
  END AS status,
  COALESCE(trr.reason, '토큰 환불 요청') AS reason,
  trr.admin_memo AS description,
  1 AS quantity,
  jsonb_build_object(
    'paid_token_amount',  trr.paid_token_amount,
    'bonus_token_amount', trr.bonus_token_amount,
    'refund_amount',      trr.refund_amount
  ) AS refund_data,
  trr.created_at,
  trr.updated_at
FROM public.token_refund_requests trr
WHERE (
  SELECT oi.id
  FROM public.order_items oi
  WHERE oi.order_id = trr.order_id
    AND oi.item_type = 'token'
  ORDER BY oi.created_at
  LIMIT 1
) IS NOT NULL;

-- 5. token_refund_requests 테이블 DROP
DROP TABLE public.token_refund_requests;
