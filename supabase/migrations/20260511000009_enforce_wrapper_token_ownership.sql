create or replace function public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,
  p_request_type text,
  p_quality      text,
  p_work_id      text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller_role text;
begin
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  if v_caller_role is distinct from 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized: caller does not own this resource';
  end if;

  if p_quality not in ('standard', 'high') then
    raise exception 'invalid quality: %', p_quality;
  end if;

  return public.use_design_tokens(
    p_user_id,
    p_ai_model,
    p_request_type,
    p_work_id
  );
end;
$$;
