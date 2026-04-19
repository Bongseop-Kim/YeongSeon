alter table public.design_chat_sessions
  drop constraint design_chat_sessions_ai_model_check;

alter table public.design_chat_sessions
  add constraint design_chat_sessions_ai_model_check
  check (ai_model in ('openai', 'gemini', 'fal'));

drop index public.idx_design_chat_messages_session_id;

create unique index idx_design_chat_messages_session_id
  on public.design_chat_messages (session_id, sequence_number);

create or replace function public.save_design_session(
  p_session_id uuid,
  p_ai_model text,
  p_first_message text,
  p_last_image_url text,
  p_last_image_file_id text,
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
    last_image_url, last_image_file_id, image_count, updated_at
  )
  values (
    v_session_id, v_user_id, p_ai_model, p_first_message,
    p_last_image_url, p_last_image_file_id,
    (
      select count(*)
      from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) m
      where (m->>'image_url') is not null
    ),
    now()
  )
  on conflict (id) do update
  set ai_model = excluded.ai_model,
      first_message = excluded.first_message,
      last_image_url = excluded.last_image_url,
      last_image_file_id = excluded.last_image_file_id,
      image_count = excluded.image_count,
      updated_at = now()
  where public.design_chat_sessions.user_id = v_user_id;

  for v_msg in
    select *
    from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb))
  loop
    insert into public.design_chat_messages (
      id, session_id, role, content,
      image_url, image_file_id, sequence_number
    )
    values (
      (v_msg->>'id')::uuid,
      v_session_id,
      v_msg->>'role',
      coalesce(v_msg->>'content', ''),
      v_msg->>'image_url',
      v_msg->>'image_file_id',
      (v_msg->>'sequence_number')::int
    )
    on conflict (session_id, sequence_number) do update
    set role = excluded.role,
        content = excluded.content,
        image_url = excluded.image_url,
        image_file_id = excluded.image_file_id;
  end loop;

  return v_session_id;
end;
$$;

grant execute on function public.save_design_session(uuid, text, text, text, text, jsonb)
  to authenticated;

alter table public.ai_generation_logs
  drop constraint ai_generation_logs_parent_work_id_fkey;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_parent_work_id_fkey
  foreign key (parent_work_id)
  references public.ai_generation_logs(work_id)
  on delete set null;

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
      'total_tokens_consumed', coalesce(sum(tokens_charged - coalesce(tokens_refunded, 0)), 0)
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
        error_type,
        count(*)::integer as count
      from filtered_logs
      where error_type is not null
      group by error_type
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

  return v_result;
end;
$$;

revoke all on public.admin_user_coupon_view from anon;
revoke all on public.admin_claim_list_view from anon;
revoke all on public.admin_claim_status_log_view from anon;
revoke all on public.admin_order_detail_view from anon;
revoke all on public.admin_order_item_view from anon;
revoke all on public.admin_order_list_view from anon;
revoke all on public.admin_order_status_log_view from anon;
revoke all on public.admin_product_list_view from anon;
revoke all on public.admin_quote_request_detail_view from anon;
revoke all on public.admin_quote_request_list_view from anon;
revoke all on public.admin_quote_request_status_log_view from anon;

grant select on public.admin_user_coupon_view to anon, authenticated, service_role;
grant select on public.admin_claim_list_view to authenticated, service_role;
grant select on public.admin_claim_status_log_view to authenticated, service_role;
grant select on public.admin_order_detail_view to authenticated, service_role;
grant select on public.admin_order_item_view to authenticated, service_role;
grant select on public.admin_order_list_view to authenticated, service_role;
grant select on public.admin_order_status_log_view to authenticated, service_role;
grant select on public.admin_product_list_view to authenticated, service_role;
grant select on public.admin_quote_request_detail_view to authenticated, service_role;
grant select on public.admin_quote_request_list_view to authenticated, service_role;
grant select on public.admin_quote_request_status_log_view to authenticated, service_role;
