insert into public.admin_settings (key, value)
values ('design_token_cost_openai_prep', '5')
on conflict (key) do nothing;

alter table public.ai_generation_logs
  add column if not exists pattern_preparation_backend text,
  add column if not exists pattern_repair_prompt_kind text,
  add column if not exists pattern_repair_applied boolean,
  add column if not exists pattern_repair_reason_codes jsonb,
  add column if not exists prep_tokens_charged integer;

do $$
declare
  v_phase_constraint text;
begin
  select conname
    into v_phase_constraint
  from pg_constraint
  where conrelid = 'public.ai_generation_logs'::regclass
    and contype = 'c'
    and conname like 'ai_generation_logs_phase_check%';

  if v_phase_constraint is not null then
    execute format(
      'alter table public.ai_generation_logs drop constraint %I',
      v_phase_constraint
    );
  end if;
end
$$;

alter table public.ai_generation_logs
  drop constraint ai_generation_logs_request_type_check;

alter table public.ai_generation_logs
  drop constraint chk_ai_generation_phase_request_type;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_phase_check
  check (phase = any (array['analysis'::text, 'prep'::text, 'render'::text])) not valid;

alter table public.ai_generation_logs
  validate constraint ai_generation_logs_phase_check;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_request_type_check
  check (
    request_type = any (
      array['analysis'::text, 'prep'::text, 'render_standard'::text, 'render_high'::text]
    )
  ) not valid;

alter table public.ai_generation_logs
  validate constraint ai_generation_logs_request_type_check;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_pattern_preparation_backend_check
  check (
    pattern_preparation_backend = any (array['local'::text, 'openai_repair'::text])
  ) not valid;

alter table public.ai_generation_logs
  validate constraint ai_generation_logs_pattern_preparation_backend_check;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_pattern_repair_prompt_kind_check
  check (
    pattern_repair_prompt_kind = any (array['all_over_tile'::text, 'one_point_motif'::text])
  ) not valid;

alter table public.ai_generation_logs
  validate constraint ai_generation_logs_pattern_repair_prompt_kind_check;

alter table public.ai_generation_logs
  add constraint chk_ai_generation_phase_request_type
  check (
    (phase = 'analysis' and request_type = 'analysis') or
    (phase = 'prep' and request_type = 'prep') or
    (phase = 'render' and request_type in ('render_standard', 'render_high'))
  ) not valid;

alter table public.ai_generation_logs
  validate constraint chk_ai_generation_phase_request_type;

drop function public.use_design_tokens(uuid, text, text, text, text);

create or replace function public.use_design_tokens(
  p_user_id uuid,
  p_ai_model text,
  p_request_type text,
  p_quality text default 'standard',
  p_work_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cost_key text;
  v_cost integer;
  v_total_bal integer;
  v_paid_bal integer;
  v_bonus_bal integer;
  v_caller_role text;
  v_paid_deduct integer;
  v_bonus_deduct integer;
  v_remaining_paid integer;
  v_batch_consume integer;
  v_batch_idx integer;
  v_batch_row record;
begin
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  if v_caller_role is distinct from 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized: caller does not own this resource';
  end if;

  if p_ai_model not in ('openai', 'gemini', 'fal') then
    raise exception 'invalid ai_model: %', p_ai_model;
  end if;
  if p_request_type not in ('analysis', 'prep', 'render_standard', 'render_high') then
    raise exception 'invalid request_type: %', p_request_type;
  end if;
  if p_quality not in ('standard', 'high') then
    raise exception 'invalid quality: %', p_quality;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_cost_key := 'design_token_cost_' || p_ai_model || '_' || p_request_type;

  select value::integer into v_cost from public.admin_settings where key = v_cost_key;
  if v_cost is null or v_cost <= 0 then
    raise exception 'cost not configured for key: %', v_cost_key;
  end if;

  if exists (
    select 1 from public.claims
    where user_id = p_user_id
      and type = 'token_refund' and status = '접수'
  ) then
    select coalesce(sum(amount) filter (where expires_at is null or expires_at > now()), 0)::integer
      into v_total_bal from public.design_tokens where user_id = p_user_id;
    return jsonb_build_object(
      'success', false, 'error', 'refund_pending', 'balance', v_total_bal, 'cost', v_cost
    );
  end if;

  select coalesce(sum(amount), 0)::integer into v_paid_bal
  from public.design_tokens
  where user_id = p_user_id
    and token_class = 'paid'
    and (expires_at is null or expires_at > now());

  select coalesce(sum(amount), 0)::integer into v_bonus_bal
  from public.design_tokens
  where user_id = p_user_id and token_class in ('bonus', 'free');
  v_total_bal := v_paid_bal + v_bonus_bal;

  if p_work_id is not null and exists (
    select 1 from public.design_tokens
    where user_id = p_user_id
      and work_id in (
        p_work_id || '_use_paid',
        p_work_id || '_use_paid_0',
        p_work_id || '_use_paid_legacy',
        p_work_id || '_use_bonus'
      )
  ) then
    return jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal);
  end if;

  if v_total_bal < v_cost then
    return jsonb_build_object(
      'success', false, 'error', 'insufficient_tokens', 'balance', v_total_bal, 'cost', v_cost
    );
  end if;

  v_paid_deduct := least(v_cost, v_paid_bal);
  v_bonus_deduct := v_cost - v_paid_deduct;

  if v_paid_deduct > 0 then
    v_remaining_paid := v_paid_deduct;
    v_batch_idx := 0;

    for v_batch_row in
      select source_order_id, expires_at, sum(amount)::integer as remaining
      from public.design_tokens
      where user_id = p_user_id
        and token_class = 'paid'
        and source_order_id is not null
        and (expires_at is null or expires_at > now())
      group by source_order_id, expires_at
      having sum(amount) > 0
      order by expires_at asc nulls last
    loop
      exit when v_remaining_paid <= 0;

      v_batch_consume := least(v_remaining_paid, v_batch_row.remaining);

      insert into public.design_tokens (
        user_id, amount, type, token_class,
        source_order_id, expires_at,
        ai_model, request_type, description, work_id
      ) values (
        p_user_id, -v_batch_consume, 'use', 'paid',
        v_batch_row.source_order_id, v_batch_row.expires_at,
        p_ai_model, p_request_type,
        'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료',
        case when p_work_id is not null
          then p_work_id || '_use_paid_' || v_batch_idx
          else null end
      )
      on conflict (work_id) where work_id is not null do nothing;

      v_remaining_paid := v_remaining_paid - v_batch_consume;
      v_batch_idx := v_batch_idx + 1;
    end loop;

    if v_remaining_paid > 0 then
      insert into public.design_tokens (
        user_id, amount, type, token_class,
        source_order_id, expires_at,
        ai_model, request_type, description, work_id
      ) values (
        p_user_id, -v_remaining_paid, 'use', 'paid',
        null, null,
        p_ai_model, p_request_type,
        'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료 (레거시)',
        case when p_work_id is not null
          then p_work_id || '_use_paid_legacy'
          else null end
      )
      on conflict (work_id) where work_id is not null do nothing;
    end if;
  end if;

  if v_bonus_deduct > 0 then
    insert into public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) values (
      p_user_id, -v_bonus_deduct, 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 보너스',
      case when p_work_id is not null then p_work_id || '_use_bonus' else null end
    )
    on conflict (work_id) where work_id is not null do nothing;
  end if;

  return jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal - v_cost);
end;
$$;

grant execute on function public.use_design_tokens(uuid, text, text, text, text) to authenticated;
grant execute on function public.use_design_tokens(uuid, text, text, text, text) to service_role;

create or replace function public.refund_design_tokens(
  p_user_id uuid,
  p_amount integer,
  p_ai_model text,
  p_request_type text,
  p_work_id text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller_role text;
begin
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  if v_caller_role is distinct from 'service_role' then
    raise exception 'unauthorized: refund requires service_role';
  end if;

  if p_ai_model not in ('openai', 'gemini', 'fal') then
    raise exception 'invalid ai_model: %', p_ai_model;
  end if;

  if p_request_type not in ('analysis', 'prep', 'render_standard', 'render_high') then
    raise exception 'invalid request_type: %', p_request_type;
  end if;

  if p_amount <= 0 then
    return;
  end if;

  if p_work_id is null or trim(p_work_id) = '' then
    raise exception 'refund_design_tokens requires non-null p_work_id for idempotency';
  end if;

  insert into public.design_tokens (user_id, amount, type, token_class, ai_model, request_type, description, work_id)
  values (
    p_user_id,
    p_amount,
    'refund',
    'paid',
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')',
    p_work_id
  )
  on conflict (work_id) where work_id is not null do nothing;
end;
$$;

drop function public.admin_get_generation_logs(date, date, text, integer, integer);

create function public.admin_get_generation_logs(
  p_start_date date,
  p_end_date date,
  p_ai_model text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  workflow_id text,
  phase text,
  work_id text,
  parent_work_id text,
  user_id uuid,
  ai_model text,
  request_type text,
  quality text,
  user_message text,
  prompt_length integer,
  request_attachments jsonb,
  design_context jsonb,
  normalized_design jsonb,
  conversation_turn integer,
  has_ci_image boolean,
  has_reference_image boolean,
  has_previous_image boolean,
  generate_image boolean,
  eligible_for_render boolean,
  missing_requirements jsonb,
  eligibility_reason text,
  detected_design jsonb,
  text_prompt text,
  image_prompt text,
  image_edit_prompt text,
  ai_message text,
  image_generated boolean,
  generated_image_url text,
  pattern_preparation_backend text,
  pattern_repair_prompt_kind text,
  pattern_repair_applied boolean,
  pattern_repair_reason_codes jsonb,
  prep_tokens_charged integer,
  tokens_charged integer,
  tokens_refunded integer,
  text_latency_ms integer,
  image_latency_ms integer,
  total_latency_ms integer,
  error_type text,
  error_message text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path to public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.workflow_id,
    l.phase,
    l.work_id,
    l.parent_work_id,
    l.user_id,
    l.ai_model,
    l.request_type,
    l.quality,
    l.user_message,
    l.prompt_length,
    l.request_attachments,
    l.design_context,
    l.normalized_design,
    l.conversation_turn,
    l.has_ci_image,
    l.has_reference_image,
    l.has_previous_image,
    l.generate_image,
    l.eligible_for_render,
    l.missing_requirements,
    l.eligibility_reason,
    l.detected_design,
    l.text_prompt,
    l.image_prompt,
    l.image_edit_prompt,
    l.ai_message,
    l.image_generated,
    l.generated_image_url,
    l.pattern_preparation_backend,
    l.pattern_repair_prompt_kind,
    l.pattern_repair_applied,
    l.pattern_repair_reason_codes,
    l.prep_tokens_charged,
    l.tokens_charged,
    l.tokens_refunded,
    l.text_latency_ms,
    l.image_latency_ms,
    l.total_latency_ms,
    l.error_type,
    l.error_message,
    l.created_at
  from public.ai_generation_logs l
  where l.created_at::date between p_start_date and p_end_date
    and (p_ai_model is null or l.ai_model = p_ai_model)
  order by l.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

grant execute on function public.admin_get_generation_logs(date, date, text, integer, integer) to authenticated;

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
