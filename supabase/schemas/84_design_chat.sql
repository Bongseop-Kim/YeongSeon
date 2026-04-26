-- =============================================================
-- 84_design_chat.sql  –  Design chat sessions & messages
-- =============================================================

CREATE TABLE public.design_chat_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_model            text        NOT NULL CHECK (ai_model IN ('openai', 'fal')),
  first_message       text        NOT NULL DEFAULT '',
  last_image_url      text,
  last_image_file_id  text,
  last_image_work_id  text REFERENCES public.ai_generation_logs(work_id) ON DELETE SET NULL,
  image_count         int         NOT NULL DEFAULT 0,
  repeat_tile_url      text,
  repeat_tile_work_id  text,
  accent_tile_url      text,
  accent_tile_work_id  text,
  accent_layout_json   jsonb,
  pattern_type         text,
  fabric_type          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_chat_sessions_user_updated_at
  ON public.design_chat_sessions (user_id, updated_at DESC);

ALTER TABLE public.design_chat_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.design_chat_sessions TO authenticated;

CREATE POLICY "본인 세션만 조회" ON public.design_chat_sessions
  FOR SELECT USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.design_chat_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES public.design_chat_sessions(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'ai')),
  content         text        NOT NULL DEFAULT '',
  image_url       text,
  image_file_id   text,
  attachments     jsonb,
  sequence_number int         NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_design_chat_messages_session_id
  ON public.design_chat_messages (session_id, sequence_number);

ALTER TABLE public.design_chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.design_chat_messages TO authenticated;

CREATE POLICY "본인 세션 메시지만 조회" ON public.design_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.save_design_session(
  p_session_id          uuid,
  p_ai_model            text,
  p_first_message       text,
  p_last_image_url      text,
  p_last_image_file_id  text,
  p_last_image_work_id  text,
  p_messages            jsonb,
  p_repeat_tile_url      text DEFAULT null,
  p_repeat_tile_work_id  text DEFAULT null,
  p_accent_tile_url      text DEFAULT null,
  p_accent_tile_work_id  text DEFAULT null,
  p_accent_layout_json   jsonb DEFAULT null,
  p_pattern_type         text DEFAULT null,
  p_fabric_type          text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_session_id uuid := COALESCE(p_session_id, gen_random_uuid());
  v_msg jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  SELECT user_id
  INTO v_owner_id
  FROM public.design_chat_sessions
  WHERE id = v_session_id;

  IF v_owner_id IS NOT NULL AND v_owner_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'forbidden: session % is not owned by user', v_session_id;
  END IF;

  INSERT INTO public.design_chat_sessions (
    id, user_id, ai_model, first_message,
    last_image_url, last_image_file_id, last_image_work_id, image_count,
    repeat_tile_url, repeat_tile_work_id,
    accent_tile_url, accent_tile_work_id,
    accent_layout_json,
    pattern_type, fabric_type,
    updated_at
  )
  VALUES (
    v_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id, p_last_image_work_id, 0,
    p_repeat_tile_url, p_repeat_tile_work_id,
    p_accent_tile_url, p_accent_tile_work_id,
    p_accent_layout_json,
    p_pattern_type, p_fabric_type,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET ai_model = EXCLUDED.ai_model,
      first_message = EXCLUDED.first_message,
      last_image_url = EXCLUDED.last_image_url,
      last_image_file_id = EXCLUDED.last_image_file_id,
      last_image_work_id = EXCLUDED.last_image_work_id,
      image_count = EXCLUDED.image_count,
      repeat_tile_url = EXCLUDED.repeat_tile_url,
      repeat_tile_work_id = EXCLUDED.repeat_tile_work_id,
      accent_tile_url = EXCLUDED.accent_tile_url,
      accent_tile_work_id = EXCLUDED.accent_tile_work_id,
      accent_layout_json = EXCLUDED.accent_layout_json,
      pattern_type = EXCLUDED.pattern_type,
      fabric_type = EXCLUDED.fabric_type,
      updated_at = now()
  WHERE public.design_chat_sessions.user_id = v_user_id;

  DELETE FROM public.design_chat_messages
  WHERE session_id = v_session_id;

  FOR v_msg IN
    SELECT *
    FROM jsonb_array_elements(COALESCE(p_messages, '[]'::jsonb))
  LOOP
    INSERT INTO public.design_chat_messages (
      id, session_id, role, content,
      image_url, image_file_id, attachments, sequence_number
    )
    VALUES (
      (v_msg->>'id')::uuid,
      v_session_id,
      v_msg->>'role',
      COALESCE(v_msg->>'content', ''),
      v_msg->>'image_url',
      v_msg->>'image_file_id',
      v_msg->'attachments',
      (v_msg->>'sequence_number')::int
    );
  END LOOP;

  UPDATE public.design_chat_sessions
  SET image_count = (
        SELECT COUNT(*)
        FROM public.design_chat_messages
        WHERE session_id = v_session_id
          AND image_url IS NOT NULL
      ),
      updated_at = now()
  WHERE id = v_session_id;

  RETURN v_session_id;
END;
$$;

COMMENT ON FUNCTION public.save_design_session(uuid, text, text, text, text, text, jsonb, text, text, text, text, jsonb, text, text)
  IS 'SECURITY DEFINER is required so authenticated clients can upsert owned design sessions and replace child messages while ownership is enforced with auth.uid().';

GRANT EXECUTE ON FUNCTION public.save_design_session(uuid, text, text, text, text, text, jsonb, text, text, text, text, jsonb, text, text)
  TO authenticated;
