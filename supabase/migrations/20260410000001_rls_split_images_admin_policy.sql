-- RLS-004: images 테이블 Admin "FOR ALL" 정책을 4개로 분리
-- WITH CHECK 누락으로 INSERT/UPDATE 쓰기 조건이 미검증되던 문제를 해결한다.

DROP POLICY "Admin full access" ON public.images;

CREATE POLICY "Admins can select images"
  ON public.images FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert images"
  ON public.images FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update images"
  ON public.images FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete images"
  ON public.images FOR DELETE
  TO authenticated
  USING (public.is_admin());
