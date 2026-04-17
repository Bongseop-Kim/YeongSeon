-- =============================================================
-- 84_design_chat.sql  –  Design chat sessions & messages
-- =============================================================

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

CREATE INDEX idx_design_chat_sessions_user_updated_at
  ON public.design_chat_sessions (user_id, updated_at DESC);

ALTER TABLE public.design_chat_sessions ENABLE ROW LEVEL SECURITY;

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
  sequence_number int         NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_chat_messages_session_id
  ON public.design_chat_messages (session_id, sequence_number);

ALTER TABLE public.design_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 세션 메시지만 조회" ON public.design_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
