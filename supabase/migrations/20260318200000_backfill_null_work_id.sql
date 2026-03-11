-- =============================================================
-- 20260318200000_backfill_null_work_id.sql
-- work_id가 NULL인 레거시 구매 토큰에 work_id 백필
-- work_id 멱등성 컬럼 추가 이전에 삽입된 purchase 레코드 대상
-- =============================================================

-- 각 null work_id 토큰에 대해 가장 가까운 시간의 미매칭 token 주문을 연결
-- DISTINCT ON (o.id): 주문당 최대 1개의 토큰만 매칭하여 work_id 유니크 인덱스 위반 방지
UPDATE public.design_tokens dt
SET    work_id = 'order_' || matched.order_id::text
FROM (
  SELECT DISTINCT ON (o.id)
    dt2.id       AS token_id,
    o.id         AS order_id
  FROM public.design_tokens dt2
  JOIN public.orders o
    ON  o.user_id     = dt2.user_id
    AND o.order_type  = 'token'
    AND o.status      = '완료'
    -- 이미 해당 주문에 연결된 토큰이 없는 경우만 매칭
    AND NOT EXISTS (
      SELECT 1 FROM public.design_tokens x
      WHERE x.work_id IN (
        'order_' || o.id::text,
        'order_' || o.id::text || '_paid'
      )
    )
  WHERE dt2.work_id IS NULL
    AND dt2.type      = 'purchase'
  ORDER BY o.id,
           ABS(EXTRACT(EPOCH FROM (dt2.created_at - o.created_at)))
) matched
WHERE dt.id = matched.token_id;
