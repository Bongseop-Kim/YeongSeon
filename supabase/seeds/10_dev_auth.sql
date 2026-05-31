INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'store@essesion.com',
    crypt('Store1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"로컬 스토어"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'admin@essesion.com',
    crypt('Admin1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"로컬 관리자"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  )
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    email_change = EXCLUDED.email_change,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'sub', '10000000-0000-4000-8000-000000000001',
      'email', 'store@essesion.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    jsonb_build_object(
      'sub', '10000000-0000-4000-8000-000000000002',
      'email', 'admin@essesion.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (provider_id, provider) DO UPDATE
SET user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

INSERT INTO public.profiles (
  id,
  name,
  phone,
  role,
  is_active,
  birth,
  phone_verified,
  notification_consent,
  notification_enabled,
  marketing_kakao_sms_consent
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    '로컬 스토어',
    '01012345678',
    'customer',
    true,
    '1990-01-01',
    true,
    true,
    true,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '로컬 관리자',
    '01087654321',
    'admin',
    true,
    '1990-01-01',
    true,
    true,
    true,
    false
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    birth = EXCLUDED.birth,
    phone_verified = EXCLUDED.phone_verified,
    notification_consent = EXCLUDED.notification_consent,
    notification_enabled = EXCLUDED.notification_enabled,
    marketing_kakao_sms_consent = EXCLUDED.marketing_kakao_sms_consent;
