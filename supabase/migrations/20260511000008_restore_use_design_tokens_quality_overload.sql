create or replace function public.use_design_tokens(
  p_user_id uuid,
  p_ai_model text,
  p_request_type text,
  p_quality text,
  p_work_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
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
