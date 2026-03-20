-- supabase/migrations/20260327000000_add_design_chat_sessions.sql

-- 1. 세션 테이블
CREATE TABLE public.design_chat_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_model            text        NOT NULL CHECK (ai_model IN ('openai', 'gemini')),
  first_message       text        NOT NULL DEFAULT '',
  last_image_url      text,
  last_image_file_id  text,
  image_count         int         NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. 메시지 테이블
CREATE TABLE public.design_chat_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES public.design_chat_sessions(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'ai')),
  content         text        NOT NULL DEFAULT '',
  image_url       text,
  image_file_id   text,
  sequence_number int         NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_chat_messages_session_id
  ON public.design_chat_messages (session_id, sequence_number);

-- 3. RLS
ALTER TABLE public.design_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 세션만 조회" ON public.design_chat_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "본인 세션 메시지만 조회" ON public.design_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- 4. save_design_session RPC (SECURITY INVOKER — RLS가 소유권 보장)
CREATE OR REPLACE FUNCTION public.save_design_session(
  p_session_id          uuid,
  p_ai_model            text,
  p_first_message       text,
  p_last_image_url      text,
  p_last_image_file_id  text,
  p_messages            jsonb  -- [{id, role, content, image_url, image_file_id, sequence_number}]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_msg     jsonb;
BEGIN
  -- 세션 upsert
  INSERT INTO public.design_chat_sessions (
    id, user_id, ai_model, first_message,
    last_image_url, last_image_file_id, image_count, updated_at
  )
  VALUES (
    p_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id,
    (SELECT COUNT(*) FROM jsonb_array_elements(p_messages) m WHERE (m->>'image_url') IS NOT NULL),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_image_url     = EXCLUDED.last_image_url,
    last_image_file_id = EXCLUDED.last_image_file_id,
    image_count        = EXCLUDED.image_count,
    updated_at         = now();

  -- 메시지 upsert (멱등성: 동일 id 중복 무시)
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

GRANT EXECUTE ON FUNCTION public.save_design_session(uuid, text, text, text, text, jsonb)
  TO authenticated;
