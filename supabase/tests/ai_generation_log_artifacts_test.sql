BEGIN;
SELECT plan(9);

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
    'prep',
    'workflow-1-prep',
    v_user,
    'openai',
    'prep',
    'prep 로그',
    false
  );

  INSERT INTO public.ai_generation_logs (
    workflow_id,
    phase,
    work_id,
    parent_work_id,
    user_id,
    ai_model,
    request_type,
    user_message,
    image_generated
  ) VALUES (
    'workflow-1',
    'render',
    'workflow-1-render',
    'workflow-1-prep',
    v_user,
    'fal',
    'render_standard',
    'render 로그',
    true
  );

  PERFORM test_helpers.set_auth(v_admin, 'authenticated');

  PERFORM public.write_ai_generation_log_artifact(
    gen_random_uuid(),
    'workflow-1',
    'prep',
    'prepared_tile',
    'workflow-1-analysis',
    null,
    'imagekit',
    'https://ik.example/artifacts/prepared-tile.png',
    1024,
    1024,
    'image/png',
    12345,
    'success',
    '{"repairApplied": true, "artifactKind": "prepared_tile"}'::jsonb
  );

  PERFORM public.write_ai_generation_log_artifact(
    gen_random_uuid(),
    'workflow-1',
    'render',
    'final',
    'workflow-1-render',
    null,
    'imagekit',
    'https://ik.example/artifacts/final.png',
    1024,
    1024,
    'image/png',
    22345,
    'success',
    '{"artifactKind": "final"}'::jsonb
  );
END;
$$;

SELECT is(
  (
    SELECT count(*)::text
    FROM public.ai_generation_log_artifacts
    WHERE workflow_id = 'workflow-1'
  ),
  '2',
  'workflow_id 기준으로 artifact row가 저장된다'
);

SELECT is(
  (
    SELECT count(*)::text
    FROM public.admin_get_generation_log_artifacts('workflow-1')
  ),
  '2',
  '관리자 RPC가 같은 workflow의 prep/render artifact를 함께 반환한다'
);

SELECT is(
  (
    SELECT artifact_type
    FROM public.admin_get_generation_log_artifacts('workflow-1')
    WHERE artifact_type = 'prepared_tile'
    LIMIT 1
  ),
  'prepared_tile',
  '관리자 RPC가 artifact_type을 반환한다'
);

SELECT is(
  (
    SELECT status
    FROM public.admin_get_generation_log_artifacts('workflow-1')
    WHERE artifact_type = 'prepared_tile'
    LIMIT 1
  ),
  'success',
  '관리자 RPC가 status를 반환한다'
);

SELECT is(
  (
    SELECT meta
    FROM public.admin_get_generation_log_artifacts('workflow-1')
    WHERE artifact_type = 'prepared_tile'
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

SELECT is(
  (
    SELECT source_work_id
    FROM public.ai_generation_log_artifacts
    WHERE artifact_type = 'final'
      AND workflow_id = 'workflow-1'
    LIMIT 1
  ),
  'workflow-1-render',
  'render artifact가 render work log를 source_work_id로 참조한다'
);

SELECT throws_ok(
  $$
    SELECT public.write_ai_generation_log_artifact(
      '00000000-0000-0000-0000-000000000099'::uuid,
      'workflow-1',
      'render',
      'final',
      'missing-render-work',
      null,
      'imagekit',
      'https://ik.example/artifacts/missing.png',
      1024,
      1024,
      'image/png',
      999,
      'success',
      '{}'::jsonb
    )
  $$,
  '23503',
  NULL,
  '존재하지 않는 source_work_id로 artifact를 저장하면 FK 오류가 발생한다'
);

SELECT * FROM finish();
ROLLBACK;
