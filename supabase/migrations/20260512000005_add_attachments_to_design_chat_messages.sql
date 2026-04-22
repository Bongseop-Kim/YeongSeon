alter table public.design_chat_messages
  add column attachments jsonb;

alter table public.design_chat_messages
  add constraint design_chat_messages_attachments_is_array
    check (attachments is null or jsonb_typeof(attachments) = 'array');

alter table public.design_chat_messages
  add constraint design_chat_messages_attachments_size
    check (attachments is null or octet_length(attachments::text) < 10000);

create or replace function public.save_design_session(
  p_session_id uuid,
  p_ai_model text,
  p_first_message text,
  p_last_image_url text,
  p_last_image_file_id text,
  p_last_image_work_id text,
  p_messages jsonb
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
    last_image_url, last_image_file_id, last_image_work_id, image_count, updated_at
  )
  values (
    v_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id, p_last_image_work_id, 0, now()
  )
  on conflict (id) do update
  set ai_model = excluded.ai_model,
      first_message = excluded.first_message,
      last_image_url = excluded.last_image_url,
      last_image_file_id = excluded.last_image_file_id,
      last_image_work_id = excluded.last_image_work_id,
      image_count = excluded.image_count,
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

grant execute on function public.save_design_session(uuid, text, text, text, text, text, jsonb)
to authenticated;
