update public.design_chat_sessions
set ai_model = 'openai'
where ai_model = 'gemini';

alter table public.design_chat_sessions
  drop constraint design_chat_sessions_ai_model_check;

alter table public.design_chat_sessions
  add constraint design_chat_sessions_ai_model_check
  check (ai_model in ('openai', 'fal'));

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
      last_image_url = coalesce(excluded.last_image_url, design_chat_sessions.last_image_url),
      last_image_file_id = coalesce(excluded.last_image_file_id, design_chat_sessions.last_image_file_id),
      last_image_work_id = coalesce(excluded.last_image_work_id, design_chat_sessions.last_image_work_id),
      image_count = excluded.image_count,
      repeat_tile_url = coalesce(excluded.repeat_tile_url, design_chat_sessions.repeat_tile_url),
      repeat_tile_work_id = coalesce(excluded.repeat_tile_work_id, design_chat_sessions.repeat_tile_work_id),
      accent_tile_url = coalesce(excluded.accent_tile_url, design_chat_sessions.accent_tile_url),
      accent_tile_work_id = coalesce(excluded.accent_tile_work_id, design_chat_sessions.accent_tile_work_id),
      accent_layout_json = coalesce(excluded.accent_layout_json, design_chat_sessions.accent_layout_json),
      pattern_type = coalesce(excluded.pattern_type, design_chat_sessions.pattern_type),
      fabric_type = coalesce(excluded.fabric_type, design_chat_sessions.fabric_type),
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

create or replace function public.admin_get_generation_logs(
  p_start_date      date,
  p_end_date        date,
  p_ai_model        text    default null,
  p_limit           integer default 50,
  p_offset          integer default 0,
  p_id              uuid    default null,
  p_request_type    text    default null,
  p_status          text    default null,
  p_id_search       text    default null
)
returns table (
  id                          uuid,
  workflow_id                 text,
  phase                       text,
  work_id                     text,
  parent_work_id              text,
  user_id                     uuid,
  ai_model                    text,
  request_type                text,
  quality                     text,
  user_message                text,
  prompt_length               integer,
  request_attachments         jsonb,
  design_context              jsonb,
  normalized_design           jsonb,
  conversation_turn           integer,
  has_ci_image                boolean,
  has_reference_image         boolean,
  has_previous_image          boolean,
  generate_image              boolean,
  eligible_for_render         boolean,
  missing_requirements        jsonb,
  eligibility_reason          text,
  detected_design             jsonb,
  text_prompt                 text,
  image_prompt                text,
  image_edit_prompt           text,
  ai_message                  text,
  image_generated             boolean,
  generated_image_url         text,
  pattern_preparation_backend text,
  pattern_repair_prompt_kind  text,
  pattern_repair_applied      boolean,
  pattern_repair_reason_codes jsonb,
  prep_tokens_charged         integer,
  tokens_charged              integer,
  tokens_refunded             integer,
  text_latency_ms             integer,
  image_latency_ms            integer,
  total_latency_ms            integer,
  error_type                  text,
  error_message               text,
  created_at                  timestamptz
)
language plpgsql
security invoker
set search_path to public
as $$
begin
  p_limit := least(greatest(coalesce(p_limit, 50), 0), 500);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id, l.workflow_id, l.phase, l.work_id, l.parent_work_id, l.user_id,
    l.ai_model, l.request_type, l.quality, l.user_message, l.prompt_length,
    l.request_attachments, l.design_context, l.normalized_design,
    l.conversation_turn, l.has_ci_image, l.has_reference_image,
    l.has_previous_image, l.generate_image, l.eligible_for_render,
    l.missing_requirements, l.eligibility_reason, l.detected_design,
    l.text_prompt, l.image_prompt, l.image_edit_prompt, l.ai_message,
    l.image_generated, l.generated_image_url, l.pattern_preparation_backend,
    l.pattern_repair_prompt_kind, l.pattern_repair_applied,
    l.pattern_repair_reason_codes, l.prep_tokens_charged,
    l.tokens_charged, l.tokens_refunded,
    l.text_latency_ms, l.image_latency_ms, l.total_latency_ms,
    l.error_type, l.error_message, l.created_at
  from public.ai_generation_logs l
  where (p_id is not null or p_id_search is not null or (
      l.created_at >= (p_start_date::timestamp at time zone 'UTC')::timestamptz
      and l.created_at < ((p_end_date + 1)::timestamp at time zone 'UTC')::timestamptz
    ))
    and (p_ai_model      is null or l.ai_model      = p_ai_model)
    and (p_id            is null or l.id            = p_id)
    and (p_request_type  is null or l.request_type  = p_request_type)
    and (p_status        is null
         or (p_status = 'success' and l.error_type is null)
         or (p_status = 'error'   and l.error_type is not null))
    and (p_id_search     is null
         or l.workflow_id = p_id_search
         or l.work_id     = p_id_search)
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

comment on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) is 'Admin-only listing with optional filters: id / request_type / status(success|error) / id_search(work_id exact).';

grant execute on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) to authenticated;

create or replace function public.admin_get_generation_stats(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security invoker
set search_path to public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  with filtered_logs as (
    select *
    from public.ai_generation_logs
    where created_at::date between p_start_date and p_end_date
  ),
  summary_data as (
    select jsonb_build_object(
      'total_count', count(*)::integer,
      'image_generated_count', count(*) filter (where image_generated)::integer,
      'avg_tokens_charged', avg(tokens_charged),
      'avg_text_latency_ms', avg(text_latency_ms),
      'avg_image_latency_ms', avg(image_latency_ms),
      'avg_total_latency_ms', avg(total_latency_ms),
      'total_requests', count(*)::integer,
      'image_success_rate',
      case
        when count(*) filter (where generate_image is true) = 0 then 0
        else round(
          (
            count(*) filter (where image_generated)::numeric
            / count(*) filter (where generate_image is true)
          ),
          4
        )
      end,
      'total_tokens_consumed',
      coalesce(sum(coalesce(tokens_charged, 0) - coalesce(tokens_refunded, 0)), 0)
    ) as value
    from filtered_logs
  ),
  by_model_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'ai_model', ai_model,
          'count', count,
          'avg_tokens', avg_tokens,
          'error_count', error_count,
          'request_count', count,
          'avg_text_latency_ms', avg_text_latency_ms,
          'avg_image_latency_ms', avg_image_latency_ms,
          'avg_token_cost', avg_tokens,
          'image_success_rate', image_success_rate
        )
        order by count desc, ai_model
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        ai_model,
        count(*)::integer as count,
        avg(tokens_charged) as avg_tokens,
        count(*) filter (where error_type is not null)::integer as error_count,
        avg(text_latency_ms) as avg_text_latency_ms,
        avg(image_latency_ms) as avg_image_latency_ms,
        case
          when count(*) filter (
            where phase <> 'analysis' and generate_image is true
          ) = 0 then null
          else round(
            (
              count(*) filter (
                where phase <> 'analysis' and image_generated
              )::numeric
              / count(*) filter (
                where phase <> 'analysis' and generate_image is true
              )
            ),
            4
          )
        end as image_success_rate
      from filtered_logs
      group by ai_model
    ) model_stats
  ),
  by_input_type_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'input_type', input_type,
          'count', count,
          'request_count', count,
          'avg_latency_ms', avg_latency_ms,
          'avg_token_cost', avg_tokens,
          'image_success_rate', image_success_rate
        )
        order by count desc, input_type
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        case
          when phase = 'analysis' then '분석'
          when phase = 'prep' or request_type = 'prep' then '보정'
          when request_type = 'render_standard' then '렌더표준'
          when request_type = 'render_high' then '렌더고품질'
          else '기타'
        end as input_type,
        count(*)::integer as count,
        avg(total_latency_ms) as avg_latency_ms,
        avg(tokens_charged) as avg_tokens,
        case
          when phase = 'analysis' then null
          when count(*) filter (where generate_image is true) = 0 then 0
          else round(
            (
              count(*) filter (where image_generated)::numeric
              / count(*) filter (where generate_image is true)
            ),
            4
          )
        end as image_success_rate
      from filtered_logs
      group by
        phase,
        case
          when phase = 'analysis' then '분석'
          when phase = 'prep' or request_type = 'prep' then '보정'
          when request_type = 'render_standard' then '렌더표준'
          when request_type = 'render_high' then '렌더고품질'
          else '기타'
        end
    ) input_type_stats
  ),
  by_pattern_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'pattern', pattern,
          'count', count,
          'request_count', count,
          'avg_token_cost', avg_tokens,
          'image_success_rate', image_success_rate
        )
        order by count desc, pattern
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        format(
          'generate_image=%s, has_ci_image=%s, has_reference_image=%s, has_previous_image=%s',
          coalesce(generate_image::text, 'null'),
          coalesce(has_ci_image::text, 'null'),
          coalesce(has_reference_image::text, 'null'),
          coalesce(has_previous_image::text, 'null')
        ) as pattern,
        count(*)::integer as count,
        avg(tokens_charged) as avg_tokens,
        case
          when count(*) filter (where generate_image is true) = 0 then 0
          else round(
            (
              count(*) filter (where image_generated)::numeric
              / count(*) filter (where generate_image is true)
            ),
            4
          )
        end as image_success_rate
      from filtered_logs
      group by
        generate_image,
        has_ci_image,
        has_reference_image,
        has_previous_image
    ) pattern_stats
  ),
  by_error_data as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'error_type', error_type,
          'count', count
        )
        order by count desc, error_type
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        coalesce(error_type, '성공') as error_type,
        count(*)::integer as count
      from filtered_logs
      group by coalesce(error_type, '성공')
    ) error_stats
  )
  select jsonb_build_object(
    'summary', summary_data.value,
    'by_model', by_model_data.value,
    'by_input_type', by_input_type_data.value,
    'by_pattern', by_pattern_data.value,
    'by_error', by_error_data.value
  )
  into v_result
  from summary_data, by_model_data, by_input_type_data, by_pattern_data, by_error_data;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_get_generation_stats(date, date) to authenticated;
