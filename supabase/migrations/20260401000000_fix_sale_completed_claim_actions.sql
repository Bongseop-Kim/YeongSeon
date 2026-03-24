-- fix: sale 완료 상태에서 반품/교환 클레임 버튼 미노출
--
-- 기존 코드가 sale 주문의 완료 상태에서도 claim_return, claim_exchange 액션을
-- 반환하고 있었음. 도메인 규칙(BR-claim-002)에 따라 sale 완료 상태에서는
-- 클레임 신청이 불가하므로 배송중·배송완료 상태로만 제한.

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
  IF (p_order_type = 'sale'   AND p_status IN ('대기중', '진행중'))
  OR (p_order_type = 'custom' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'sample' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'repair' AND p_status = '대기중')
  OR (p_order_type = 'token'  AND p_status = '대기중')
  THEN
    v_actions := v_actions || ARRAY['claim_cancel'];
  END IF;

  -- 완료 상태는 제외: BR-claim-002에 따라 sale 완료 이후 클레임 불가
  IF p_order_type = 'sale' AND p_status IN ('배송중', '배송완료') THEN
    v_actions := v_actions || ARRAY['claim_return', 'claim_exchange'];
  END IF;

  IF p_order_type <> 'token' AND p_status IN ('배송중', '배송완료') THEN
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
