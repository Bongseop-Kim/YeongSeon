-- 1. user_id: NOT NULL 제거 + FK ON DELETE CASCADE → SET NULL
ALTER TABLE public.inquiries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.inquiries DROP CONSTRAINT inquiries_user_id_fkey;
ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- 2. 기존 사용자 정책 재생성 (TO authenticated 명시)
DROP POLICY IF EXISTS "Users can view their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users can create their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users can update their own pending inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users can delete their own pending inquiries" ON public.inquiries;

CREATE POLICY "Users can view their own inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inquiries"
  ON public.inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = '답변대기' AND answer IS NULL AND answer_date IS NULL);

CREATE POLICY "Users can update their own pending inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = '답변대기')
  WITH CHECK (auth.uid() = user_id AND status = '답변대기' AND answer IS NULL AND answer_date IS NULL);

CREATE POLICY "Users can delete their own pending inquiries"
  ON public.inquiries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = '답변대기');

-- 3. 관리자/서비스 정책 추가
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Admins can answer inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_service_all" ON public.inquiries;

CREATE POLICY "Admins can view all inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin'::public.user_role, 'manager'::public.user_role)
    )
  );

CREATE POLICY "Admins can answer inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin'::public.user_role, 'manager'::public.user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin'::public.user_role, 'manager'::public.user_role)
    )
    AND status = '답변완료'
    AND answer IS NOT NULL
    AND answer_date IS NOT NULL
  );

CREATE POLICY "inquiries_service_all"
  ON public.inquiries
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. 컬럼 수준 UPDATE 권한 강화
REVOKE UPDATE ON TABLE public.inquiries FROM authenticated;
GRANT UPDATE (title, content, status, answer, answer_date) ON TABLE public.inquiries TO authenticated;
