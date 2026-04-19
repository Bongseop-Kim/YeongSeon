BEGIN;
SELECT plan(11);

DO $$
DECLARE
  v_user_a uuid := 'dc000001-0000-0000-0000-000000000001';
  v_user_b uuid := 'dc000001-0000-0000-0000-000000000002';
  v_session_id uuid := 'dc100001-0000-0000-0000-000000000001';
BEGIN
  PERFORM test_helpers.create_test_user(v_user_a);
  PERFORM test_helpers.create_test_user(v_user_b);

  INSERT INTO public.design_chat_sessions (
    id,
    user_id,
    ai_model,
    first_message,
    last_image_url,
    last_image_file_id,
    image_count
  )
  VALUES (
    v_session_id,
    v_user_a,
    'openai',
    '첫 요청',
    NULL,
    NULL,
    1
  );

  INSERT INTO public.design_chat_messages (
    id,
    session_id,
    role,
    content,
    image_url,
    image_file_id,
    sequence_number
  )
  VALUES
    (
      'dc200001-0000-0000-0000-000000000001',
      v_session_id,
      'user',
      '첫 요청',
      NULL,
      NULL,
      0
    ),
    (
      'dc200001-0000-0000-0000-000000000002',
      v_session_id,
      'ai',
      '첫 응답',
      'https://example.com/design-a.png',
      'file-a',
      1
    );
END;
$$;

SELECT ok(
  has_table_privilege('authenticated', 'public.design_chat_sessions', 'SELECT'),
  'authenticated는 design_chat_sessions SELECT 권한을 가진다'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.design_chat_messages', 'SELECT'),
  'authenticated는 design_chat_messages SELECT 권한을 가진다'
);

SELECT ok(
  set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', 'dc000001-0000-0000-0000-000000000001',
      'role', 'authenticated',
      'iss', 'supabase'
    )::text,
    true
  ) IS NOT NULL,
  'user A 인증 컨텍스트를 설정할 수 있다'
);

SET LOCAL ROLE authenticated;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.design_chat_sessions
    WHERE id = 'dc100001-0000-0000-0000-000000000001'::uuid
  ),
  1,
  'user A는 자신의 design_chat_sessions 행만 조회한다'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.design_chat_messages
    WHERE session_id = 'dc100001-0000-0000-0000-000000000001'::uuid
  ),
  2,
  'user A는 자신의 design_chat_messages 행을 조회한다'
);

SELECT lives_ok(
  $$
    SELECT public.save_design_session(
      'dc100001-0000-0000-0000-000000000001'::uuid,
      'openai',
      '첫 요청',
      NULL,
      NULL,
      '[
        {
          "id": "dc200001-0000-0000-0000-000000000011",
          "role": "user",
          "content": "교체된 요청",
          "image_url": null,
          "image_file_id": null,
          "sequence_number": 0
        }
      ]'::jsonb
    )
  $$,
  'owner는 save_design_session RPC로 자신의 세션을 저장할 수 있다'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.design_chat_messages
    WHERE session_id = 'dc100001-0000-0000-0000-000000000001'::uuid
  ),
  1,
  'save_design_session은 세션 메시지를 전체 교체한다'
);

SELECT ok(
  set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', 'dc000001-0000-0000-0000-000000000002',
      'role', 'authenticated',
      'iss', 'supabase'
    )::text,
    true
  ) IS NOT NULL,
  'user B 인증 컨텍스트를 설정할 수 있다'
);

SET LOCAL ROLE authenticated;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.design_chat_sessions
    WHERE id = 'dc100001-0000-0000-0000-000000000001'::uuid
  ),
  0,
  'user B는 user A의 design_chat_sessions 행을 조회할 수 없다'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.design_chat_messages m
    JOIN public.design_chat_sessions s
      ON s.id = m.session_id
    WHERE s.id = 'dc100001-0000-0000-0000-000000000001'::uuid
  ),
  0,
  'user B는 조인으로도 user A의 design_chat_messages를 간접 조회할 수 없다'
);

SELECT throws_ok(
  $$
    SELECT public.save_design_session(
      'dc100001-0000-0000-0000-000000000001'::uuid,
      'openai',
      '침범 시도',
      NULL,
      NULL,
      '[]'::jsonb
    )
  $$,
  'P0001',
  NULL,
  'non-owner는 save_design_session RPC를 호출할 수 없다'
);

SELECT * FROM finish();
ROLLBACK;
