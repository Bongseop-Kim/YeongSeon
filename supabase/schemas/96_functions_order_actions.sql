-- =============================================================
-- 96_functions_order_actions.sql  – HATEOAS action helpers
-- =============================================================

-- ── get_order_admin_actions ───────────────────────────────────
-- 순수 함수: DB 조회 없음. 주어진 order_type + status에서
-- 어드민이 수행 가능한 액션 목록을 반환한다.
-- advance: 다음 상태로 진행, rollback: 이전 상태로 롤백, cancel: 취소 처리
CREATE OR REPLACE FUNCTION public.get_order_admin_actions(
  p_order_type text,
  p_status     text
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- 공통 종료 상태: 아무 액션도 없음
    WHEN p_status IN ('완료', '취소', '실패') THEN ARRAY[]::text[]

    WHEN p_order_type = 'sale' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '진행중'   THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'custom' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '제작완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'sample' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'repair' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback']
      WHEN '수선중'   THEN ARRAY['advance', 'rollback']
      WHEN '수선완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'token' THEN CASE p_status
      WHEN '대기중' THEN ARRAY['advance', 'cancel']
      WHEN '결제중' THEN ARRAY['rollback', 'cancel']
      ELSE ARRAY[]::text[]
    END

    ELSE ARRAY[]::text[]
  END;
$$;

-- ── get_order_customer_actions ────────────────────────────────
-- STABLE: order_id 전달 시 claims 테이블 조회.
-- 고객이 주문에 대해 수행 가능한 액션 목록을 반환한다.
-- claim_cancel / claim_return / claim_exchange / confirm_purchase
CREATE OR REPLACE FUNCTION public.get_order_customer_actions(
  p_order_type text,
  p_status     text,
  p_order_id   uuid DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
declare
  v_actions          text[] := ARRAY[]::text[];
  v_has_active_claim boolean := false;
begin
  -- claim_cancel 가드
  IF (p_order_type = 'sale'   AND p_status IN ('대기중', '진행중'))
  OR (p_order_type = 'custom' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'sample' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'repair' AND p_status = '대기중')
  OR (p_order_type = 'token'  AND p_status = '대기중')
  THEN
    v_actions := v_actions || ARRAY['claim_cancel'];
  END IF;

  -- claim_return / claim_exchange: sale 주문에서 배송 이후 상태만
  IF p_order_type = 'sale' AND p_status IN ('배송중', '배송완료', '완료') THEN
    v_actions := v_actions || ARRAY['claim_return', 'claim_exchange'];
  END IF;

  -- confirm_purchase: token 제외, 배송중/배송완료 상태
  IF p_order_type <> 'token' AND p_status IN ('배송중', '배송완료') THEN
    -- order_id 전달 시: 활성 클레임이 없어야 포함
    IF p_order_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.order_id = p_order_id
          AND c.status IN ('접수', '처리중', '수거요청', '수거완료', '재발송')
      ) INTO v_has_active_claim;

      IF NOT v_has_active_claim THEN
        v_actions := v_actions || ARRAY['confirm_purchase'];
      END IF;
    ELSE
      v_actions := v_actions || ARRAY['confirm_purchase'];
    END IF;
  END IF;

  RETURN v_actions;
end;
$$;
