-- supabase/migrations/20260405000000_notification_fields.sql

-- 1. profiles 알림 관련 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_consent  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_enabled  boolean NOT NULL DEFAULT true;

-- 2. authenticated가 새 컬럼을 업데이트할 수 있도록 권한 부여
-- phone_verified는 제외: 클라이언트가 직접 true로 설정하는 것을 방지 (verify-phone Edge Function에서만 service role로 업데이트)
GRANT UPDATE (notification_consent, notification_enabled)
  ON TABLE public.profiles TO authenticated;

-- 3. OTP 인증 테이블
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone      varchar     NOT NULL,
  code       varchar(6)  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified   boolean     NOT NULL DEFAULT false
);

-- 한 유저당 최신 1건만 유효하도록 (이전 OTP는 자동 무효화됨 — expires_at 기준)
CREATE INDEX IF NOT EXISTS phone_verifications_user_id_idx
  ON public.phone_verifications (user_id, created_at DESC);

-- RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- 본인 OTP만 조회/삽입 가능
CREATE POLICY "Users can manage own verifications"
  ON public.phone_verifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
