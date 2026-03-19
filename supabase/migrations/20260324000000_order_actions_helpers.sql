-- =============================================================
-- 20260324000000_order_actions_helpers.sql
-- 구 샘플 상태 제거 시 orders_status_check 적용 전 선검증
-- =============================================================

DO $$
DECLARE
  v_invalid_statuses text[];
BEGIN
  SELECT array_agg(DISTINCT status ORDER BY status)
  INTO v_invalid_statuses
  FROM public.orders
  WHERE status <> ALL (ARRAY[
    '대기중','결제중','진행중','배송중','배송완료','완료','취소','실패',
    '접수','제작중','제작완료',
    '수선중','수선완료'
  ]);

  IF v_invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot apply orders_status_check: public.orders.status contains disallowed values: %',
      array_to_string(v_invalid_statuses, ', ');
  END IF;
END;
$$;

ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    '대기중','결제중','진행중','배송중','배송완료','완료','취소','실패',
    '접수','제작중','제작완료',
    '수선중','수선완료'
  ]));
