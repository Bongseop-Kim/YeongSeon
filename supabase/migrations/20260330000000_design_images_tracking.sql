-- design_chat_messages 이미지를 images 테이블에 통합 등록
-- design 도메인도 다른 도메인(custom_order, quote_request, reform)과 동일하게
-- images 테이블에서 이미지 라이프사이클을 관리한다. expires_at = NULL (영구 보관).

-- 1. 부분 UNIQUE 인덱스: design_message entity_type에 대한 중복 방지
--    design_chat_messages의 ON CONFLICT (id) DO NOTHING과 동일한 멱등성 보장
CREATE UNIQUE INDEX idx_images_design_message_unique
  ON public.images (entity_type, entity_id)
  WHERE entity_type = 'design_message';

-- 2. save_design_session RPC 재정의
--    메시지 INSERT 루프 내에서 image_url이 있는 메시지를 images 테이블에도 등록
--    SECURITY DEFINER 사유:
--    design_chat_* 테이블은 직접 INSERT/UPDATE를 허용하지 않고, 이 RPC만 쓰기 진입점으로 유지한다.
--    auth.uid() 소유권 검증과 세션/메시지 불변식은 함수 내부에서 수행한다.
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
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_session_id uuid := coalesce(p_session_id, gen_random_uuid());
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
    last_image_url, last_image_file_id, image_count, updated_at
  )
  VALUES (
    v_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id,
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) m
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

  FOR v_msg IN
    SELECT *
    FROM jsonb_array_elements(coalesce(p_messages, '[]'::jsonb))
  LOOP
    INSERT INTO public.design_chat_messages (
      id, session_id, role, content,
      image_url, image_file_id, sequence_number
    )
    VALUES (
      (v_msg->>'id')::uuid,
      v_session_id,
      v_msg->>'role',
      COALESCE(v_msg->>'content', ''),
      v_msg->>'image_url',
      v_msg->>'image_file_id',
      (v_msg->>'sequence_number')::int
    )
    ON CONFLICT (id) DO NOTHING;

    -- 이미지가 있는 메시지는 images 테이블에도 등록 (영구 보관)
    IF (v_msg->>'image_url') IS NOT NULL THEN
      INSERT INTO public.images (
        url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at
      ) VALUES (
        v_msg->>'image_url',
        nullif(v_msg->>'image_file_id', ''),
        '/design-sessions',
        'design_message',
        (v_msg->>'id'),
        v_user_id,
        NULL
      )
      ON CONFLICT (entity_type, entity_id)
        WHERE entity_type = 'design_message'
      DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_session_id;
END;
$$;

-- 3. 기존 design_chat_messages 이미지 백필
INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at)
SELECT
  m.image_url,
  m.image_file_id,
  '/design-sessions',
  'design_message',
  m.id::text,
  s.user_id,
  NULL
FROM public.design_chat_messages m
JOIN public.design_chat_sessions s ON s.id = m.session_id
WHERE m.image_url IS NOT NULL
ON CONFLICT (entity_type, entity_id)
  WHERE entity_type = 'design_message'
DO NOTHING;
