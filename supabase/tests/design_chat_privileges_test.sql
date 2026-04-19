BEGIN;
SELECT plan(4);

SELECT ok(
  has_table_privilege('authenticated', 'public.design_chat_sessions', 'SELECT'),
  'authenticated는 design_chat_sessions SELECT 권한을 가진다'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.design_chat_messages', 'SELECT'),
  'authenticated는 design_chat_messages SELECT 권한을 가진다'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'design_chat_sessions'
      AND policyname = '본인 세션만 조회'
  ),
  'design_chat_sessions 본인 세션 조회 정책이 존재한다'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'design_chat_messages'
      AND policyname = '본인 세션 메시지만 조회'
  ),
  'design_chat_messages 본인 세션 조회 정책이 존재한다'
);

SELECT * FROM finish();
ROLLBACK;
