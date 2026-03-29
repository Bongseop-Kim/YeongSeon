-- =============================================================
-- RLS 강화: order_items 사용자 정책에 TO authenticated 추가
--           + auth.uid() → (SELECT auth.uid()) 서브쿼리 최적화
--
-- 변경 이유:
--   - TO 역할 절 없으면 anon 역할도 정책 평가 대상에 포함됨
--   - (SELECT auth.uid()) 형태는 Postgres optimizer가 initPlan으로
--     1회만 평가하므로 다수 행 조회 시 성능이 크게 향상됨
-- =============================================================

-- 기존 정책 삭제
DROP POLICY "Users can view their own order items" ON public.order_items;
DROP POLICY "Users can create their own order items" ON public.order_items;

-- 수정된 정책 재생성
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can create their own order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = (SELECT auth.uid())
  ));
