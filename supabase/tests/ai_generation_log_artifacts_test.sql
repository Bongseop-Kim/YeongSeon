BEGIN;
SELECT plan(6);

DO $$
DECLARE
  v_admin uuid := 'dd000001-0000-0000-0000-000000000001';
  v_user uuid := 'dd000001-0000-0000-0000-000000000002';
BEGIN
  PERFORM test_helpers.create_test_user(v_admin);
  PERFORM test_helpers.create_test_profile(v_admin, 'admin', '관리자');
  PERFORM test_helpers.create_test_user(v_user);

  INSERT INTO public.ai_generation_logs (
    workflow_id,
    phase,
    work_id,
    user_id,
    ai_model,
    request_type,
    user_message,
    image_generated
  ) VALUES (
    'workflow-1',
    'analysis',
    'workflow-1-analysis',
    v_user,
    'fal',
    'analysis',
    '기준 로그',
    false
  );

  PERFORM test_helpers.set_auth(v_admin, 'authenticated');

  INSERT INTO public.ai_generation_log_artifacts (
    workflow_id,
    phase,
    artifact_type,
    source_work_id,
    storage_provider,
    image_url,
    image_width,
    image_height,
    mime_type,
    file_size_bytes,
    status,
    meta
  ) VALUES (
    'workflow-1',
    'prep',
    'prepared_tile',
    'workflow-1-analysis',
    'imagekit',
    'https://ik.example/artifacts/prepared-tile.png',
    1024,
    1024,
    'image/png',
    12345,
    'success',
    '{"repairApplied": true, "artifactKind": "prepared_tile"}'::jsonb
  );
END;
$$;

SELECT is(
  (
    SELECT count(*)::text
    FROM public.ai_generation_log_artifacts
    WHERE workflow_id = 'workflow-1'
  ),
  '1',
  'workflow_id 기준으로 artifact row가 저장된다'
);

SELECT is(
  (
    SELECT artifact_type
    FROM public.admin_get_generation_log_artifacts('workflow-1')
    LIMIT 1
  ),
  'prepared_tile',
  '관리자 RPC가 artifact_type을 반환한다'
);

SELECT is(
  (
    SELECT status
    FROM public.admin_get_generation_log_artifacts('workflow-1')
    LIMIT 1
  ),
  'success',
  '관리자 RPC가 status를 반환한다'
);

SELECT is(
  (
    SELECT meta
    FROM public.admin_get_generation_log_artifacts('workflow-1')
    LIMIT 1
  ),
  '{"repairApplied": true, "artifactKind": "prepared_tile"}'::jsonb,
  '관리자 RPC가 meta jsonb를 그대로 반환한다'
);

SELECT test_helpers.set_auth(
  'dd000001-0000-0000-0000-000000000002'::uuid,
  'authenticated'
);

SELECT throws_ok(
  $$ SELECT public.admin_get_generation_log_artifacts('workflow-1') $$,
  'P0001',
  NULL,
  '비관리자는 관리자 artifact RPC를 호출할 수 없다'
);

SELECT test_helpers.set_auth(
  'dd000001-0000-0000-0000-000000000001'::uuid,
  'authenticated'
);

SELECT is(
  (
    SELECT artifact_type
    FROM public.ai_generation_log_artifacts
    WHERE workflow_id = 'workflow-1'
    LIMIT 1
  ),
  'prepared_tile',
  'artifact_type이 정확히 저장된다'
);

SELECT * FROM finish();
ROLLBACK;
