-- design chat 세션 저장 RLS/인덱스 보강
CREATE INDEX idx_design_chat_sessions_user_updated_at
  ON public.design_chat_sessions (user_id, updated_at DESC);

CREATE POLICY "본인 세션만 생성" ON public.design_chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "본인 세션만 수정" ON public.design_chat_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "본인 세션 메시지만 생성" ON public.design_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.design_chat_sessions s
      WHERE s.id = session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.save_design_session(
  p_session_id          uuid,
  p_ai_model            text,
  p_first_message       text,
  p_last_image_url      text,
  p_last_image_file_id  text,
  p_messages            jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_msg jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  SELECT user_id
  INTO v_owner_id
  FROM public.design_chat_sessions
  WHERE id = p_session_id;

  IF v_owner_id IS NOT NULL AND v_owner_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'forbidden: session % is not owned by user', p_session_id;
  END IF;

  INSERT INTO public.design_chat_sessions (
    id, user_id, ai_model, first_message,
    last_image_url, last_image_file_id, image_count, updated_at
  )
  VALUES (
    p_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id,
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(p_messages) m
      WHERE (m->>'image_url') IS NOT NULL
    ),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET ai_model = EXCLUDED.ai_model,
      first_message = EXCLUDED.first_message,
      last_image_url = EXCLUDED.last_image_url,
      last_image_file_id = EXCLUDED.last_image_file_id,
      image_count = EXCLUDED.image_count,
      updated_at = now()
  WHERE public.design_chat_sessions.user_id = v_user_id;

  FOR v_msg IN SELECT * FROM jsonb_array_elements(p_messages)
  LOOP
    INSERT INTO public.design_chat_messages (
      id, session_id, role, content,
      image_url, image_file_id, sequence_number
    )
    VALUES (
      (v_msg->>'id')::uuid,
      p_session_id,
      v_msg->>'role',
      COALESCE(v_msg->>'content', ''),
      v_msg->>'image_url',
      v_msg->>'image_file_id',
      (v_msg->>'sequence_number')::int
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RETURN p_session_id;
END;
$$;
