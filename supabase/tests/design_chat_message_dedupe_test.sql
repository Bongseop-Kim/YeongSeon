BEGIN;
SELECT plan(4);

DROP INDEX IF EXISTS public.idx_design_chat_messages_session_id;

DO $setup$
DECLARE
  v_user_id uuid := 'dd000001-0000-0000-0000-000000000011';
  v_session_id uuid := 'ee05ca86-7e5c-4a93-aa96-ad581cbe7d69';
BEGIN
  PERFORM test_helpers.create_test_user(v_user_id);

  INSERT INTO public.design_chat_sessions (
    id, user_id, ai_model, first_message
  ) VALUES (
    v_session_id, v_user_id, 'openai', '중복 메시지 정리 테스트'
  );

  INSERT INTO public.design_chat_messages (
    id, session_id, role, content, image_url, image_file_id, sequence_number, created_at
  ) VALUES
    (
      '11111111-1111-1111-1111-111111111111',
      v_session_id,
      'user',
      'older',
      'https://example.com/older.png',
      'older-file',
      1,
      '2026-04-19T00:00:00Z'::timestamptz
    ),
    (
      '22222222-2222-2222-2222-222222222222',
      v_session_id,
      'ai',
      'newer',
      'https://example.com/newer.png',
      'newer-file',
      1,
      '2026-04-19T00:01:00Z'::timestamptz
    );

  INSERT INTO public.images (
    url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at
  ) VALUES
    (
      'https://example.com/older.png',
      'older-file',
      '/design-sessions',
      'design_message',
      '11111111-1111-1111-1111-111111111111',
      v_user_id,
      NULL
    ),
    (
      'https://example.com/newer.png',
      'newer-file',
      '/design-sessions',
      'design_message',
      '22222222-2222-2222-2222-222222222222',
      v_user_id,
      NULL
    );
END $setup$;

WITH duplicate_design_chat_messages AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY session_id, sequence_number
      ORDER BY created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.design_chat_messages
),
deleted_design_chat_messages AS (
  DELETE FROM public.design_chat_messages target
  USING duplicate_design_chat_messages duplicate
  WHERE target.id = duplicate.id
    AND duplicate.duplicate_rank > 1
  RETURNING target.id::text AS id
)
DELETE FROM public.images image
USING deleted_design_chat_messages deleted
WHERE image.entity_type = 'design_message'
  AND image.entity_id = deleted.id;

CREATE UNIQUE INDEX idx_design_chat_messages_session_id
  ON public.design_chat_messages (session_id, sequence_number);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.design_chat_messages
    WHERE session_id = 'ee05ca86-7e5c-4a93-aa96-ad581cbe7d69'::uuid
      AND sequence_number = 1
  ),
  1,
  '중복 session_id/sequence_number 메시지는 1개만 남긴다'
);

SELECT is(
  (
    SELECT content
    FROM public.design_chat_messages
    WHERE id = '22222222-2222-2222-2222-222222222222'::uuid
  ),
  'newer',
  '가장 최신 created_at 메시지를 유지한다'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.images
    WHERE entity_type = 'design_message'
      AND entity_id = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  '삭제된 중복 메시지의 images 레코드도 함께 제거한다'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.images
    WHERE entity_type = 'design_message'
      AND entity_id = '22222222-2222-2222-2222-222222222222'
  ),
  1,
  '유지된 메시지의 images 레코드는 보존한다'
);

SELECT * FROM finish();
ROLLBACK;
