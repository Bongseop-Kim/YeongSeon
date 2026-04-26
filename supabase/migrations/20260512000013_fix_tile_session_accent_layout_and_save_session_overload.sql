alter table public.design_chat_sessions
  add column if not exists accent_layout_json jsonb;

drop function if exists public.save_design_session(uuid, text, text, text, text, text, jsonb);
drop function if exists public.save_design_session(uuid, text, text, text, text, text, jsonb, text, text, text, text, text, text);

create or replace function public.save_design_session(
  p_session_id uuid,
  p_ai_model text,
  p_first_message text,
  p_last_image_url text,
  p_last_image_file_id text,
  p_last_image_work_id text,
  p_messages jsonb,
  p_repeat_tile_url text default null,
  p_repeat_tile_work_id text default null,
  p_accent_tile_url text default null,
  p_accent_tile_work_id text default null,
  p_accent_layout_json jsonb default null,
  p_pattern_type text default null,
  p_fabric_type text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_session_id uuid := coalesce(p_session_id, gen_random_uuid());
  v_msg jsonb;
begin
  if v_user_id is null then
    raise exception 'unauthorized: must be logged in';
  end if;

  select user_id
  into v_owner_id
  from public.design_chat_sessions
  where id = v_session_id;

  if v_owner_id is not null and v_owner_id is distinct from v_user_id then
    raise exception 'forbidden: session % is not owned by user', v_session_id;
  end if;

  insert into public.design_chat_sessions (
    id, user_id, ai_model, first_message,
    last_image_url, last_image_file_id, last_image_work_id, image_count,
    repeat_tile_url, repeat_tile_work_id,
    accent_tile_url, accent_tile_work_id,
    accent_layout_json,
    pattern_type, fabric_type,
    updated_at
  )
  values (
    v_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id, p_last_image_work_id, 0,
    p_repeat_tile_url, p_repeat_tile_work_id,
    p_accent_tile_url, p_accent_tile_work_id,
    p_accent_layout_json,
    p_pattern_type, p_fabric_type,
    now()
  )
  on conflict (id) do update
  set ai_model = excluded.ai_model,
      first_message = excluded.first_message,
      last_image_url = excluded.last_image_url,
      last_image_file_id = excluded.last_image_file_id,
      last_image_work_id = excluded.last_image_work_id,
      image_count = excluded.image_count,
      repeat_tile_url = excluded.repeat_tile_url,
      repeat_tile_work_id = excluded.repeat_tile_work_id,
      accent_tile_url = excluded.accent_tile_url,
      accent_tile_work_id = excluded.accent_tile_work_id,
      accent_layout_json = excluded.accent_layout_json,
      pattern_type = excluded.pattern_type,
      fabric_type = excluded.fabric_type,
      updated_at = now()
  where public.design_chat_sessions.user_id = v_user_id;

  delete from public.design_chat_messages
  where session_id = v_session_id;

  for v_msg in
    select *
    from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb))
  loop
    insert into public.design_chat_messages (
      id, session_id, role, content,
      image_url, image_file_id, attachments, sequence_number
    )
    values (
      (v_msg->>'id')::uuid,
      v_session_id,
      v_msg->>'role',
      coalesce(v_msg->>'content', ''),
      v_msg->>'image_url',
      v_msg->>'image_file_id',
      v_msg->'attachments',
      (v_msg->>'sequence_number')::int
    );
  end loop;

  update public.design_chat_sessions
  set image_count = (
        select count(*)
        from public.design_chat_messages
        where session_id = v_session_id
          and image_url is not null
      ),
      updated_at = now()
  where id = v_session_id;

  return v_session_id;
end;
$$;

comment on function public.save_design_session(uuid, text, text, text, text, text, jsonb, text, text, text, text, jsonb, text, text)
  is 'SECURITY DEFINER is required so authenticated clients can upsert owned design sessions and replace child messages while ownership is enforced with auth.uid().';

grant execute on function public.save_design_session(uuid, text, text, text, text, text, jsonb, text, text, text, text, jsonb, text, text)
  to authenticated;
