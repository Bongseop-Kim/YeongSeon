-- notification 설정 쓰기 경로를 RPC로 단일화하고
-- phone_verifications / claim 알림 중복 발송 방지용 보안·감사 로그를 강화한다.

REVOKE UPDATE (notification_consent, notification_enabled)
  ON TABLE public.profiles FROM authenticated;

CREATE TABLE IF NOT EXISTS public.notification_preference_logs (
  id                             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_notification_consent  boolean     NOT NULL,
  new_notification_consent       boolean     NOT NULL,
  previous_notification_enabled  boolean     NOT NULL,
  new_notification_enabled       boolean     NOT NULL,
  created_at                     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_preference_logs_user_id_idx
  ON public.notification_preference_logs (user_id, created_at DESC);

ALTER TABLE public.notification_preference_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preference logs"
  ON public.notification_preference_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification preference logs"
  ON public.notification_preference_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- SECURITY DEFINER 사유: profiles.notification_* 직접 UPDATE를 열지 않고
-- auth.uid() 소유권 검증 + 감사 로그 기록을 RPC로 강제한다.
CREATE OR REPLACE FUNCTION public.set_notification_preferences(
  p_notification_consent boolean DEFAULT NULL,
  p_notification_enabled boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id               uuid;
  v_current_consent       boolean;
  v_current_enabled       boolean;
  v_next_consent          boolean;
  v_next_enabled          boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select notification_consent, notification_enabled
    into v_current_consent, v_current_enabled
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_next_consent := coalesce(p_notification_consent, v_current_consent);
  v_next_enabled := coalesce(p_notification_enabled, v_current_enabled);

  if v_next_consent = v_current_consent
     and v_next_enabled = v_current_enabled then
    return;
  end if;

  update public.profiles
  set notification_consent = v_next_consent,
      notification_enabled = v_next_enabled
  where id = v_user_id;

  insert into public.notification_preference_logs (
    user_id,
    previous_notification_consent,
    new_notification_consent,
    previous_notification_enabled,
    new_notification_enabled
  )
  values (
    v_user_id,
    v_current_consent,
    v_next_consent,
    v_current_enabled,
    v_next_enabled
  );
end;
$$;

REVOKE ALL ON FUNCTION public.set_notification_preferences(boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_notification_preferences(boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_preferences(boolean, boolean) TO service_role;

DROP POLICY "Users can manage own verifications" ON public.phone_verifications;

CREATE POLICY "Users can view their own phone verifications"
  ON public.phone_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage phone verifications"
  ON public.phone_verifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE public.phone_verifications TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.phone_verifications FROM authenticated;

CREATE TABLE IF NOT EXISTS public.claim_notification_logs (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  claim_id   uuid        NOT NULL,
  status     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT claim_notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT claim_notification_logs_claim_id_fkey
    FOREIGN KEY (claim_id) REFERENCES public.claims (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT claim_notification_logs_claim_id_status_key UNIQUE (claim_id, status)
);

CREATE INDEX IF NOT EXISTS idx_claim_notification_logs_claim_id
  ON public.claim_notification_logs USING btree (claim_id, created_at DESC);

ALTER TABLE public.claim_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of their own claim notifications"
  ON public.claim_notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all claim notifications"
  ON public.claim_notification_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
