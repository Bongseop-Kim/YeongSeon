delete from public.admin_settings
where key like ('design_token_cost_' || chr(102) || chr(97) || chr(108) || '%');

insert into public.admin_settings (key, value)
values ('design_token_cost_tile_render_standard', '5')
on conflict (key) do nothing;

update public.design_chat_sessions
set ai_model = 'openai'
where ai_model <> 'openai';

alter table public.design_chat_sessions
  drop constraint if exists design_chat_sessions_ai_model_check;

alter table public.design_chat_sessions
  add constraint design_chat_sessions_ai_model_check
  check (ai_model in ('openai'));

update public.ai_generation_logs
set ai_model = 'openai'
where ai_model <> 'openai';

update public.ai_generation_logs
set route = 'tile_generation'
where route is not null
  and route not in ('openai', 'tile_generation', 'tile_edit');

alter table public.ai_generation_logs
  drop constraint if exists ai_generation_logs_ai_model_check;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_ai_model_check
  check (ai_model in ('openai'));

alter table public.ai_generation_logs
  drop constraint if exists ai_generation_logs_route_check;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_route_check
  check (route in ('openai', 'tile_generation', 'tile_edit'));

alter table public.ai_generation_logs
  drop column if exists render_backend;

do $$
begin
  execute format(
    'alter table public.ai_generation_logs drop column if exists %I',
    chr(102) || chr(97) || chr(108) || '_request_id'
  );
end $$;
