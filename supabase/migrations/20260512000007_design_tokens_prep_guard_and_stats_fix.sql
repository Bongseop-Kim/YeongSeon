do $$
declare
  v_invalid_request_types text;
begin
  update public.design_tokens
  set request_type = case
    when request_type = 'text_only' then 'analysis'
    when request_type = 'text_and_image' then 'render_standard'
    else request_type
  end
  where request_type in ('text_only', 'text_and_image');

  select string_agg(distinct request_type, ', ' order by request_type)
    into v_invalid_request_types
  from public.design_tokens
  where request_type is not null
    and request_type <> all (array['analysis'::text, 'prep'::text, 'render_standard'::text, 'render_high'::text]);

  if v_invalid_request_types is not null then
    raise exception 'design_tokens contains unsupported request_type values: %', v_invalid_request_types;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.design_tokens'::regclass
      and conname = 'design_tokens_request_type_check'
  ) then
    alter table public.design_tokens
      add constraint design_tokens_request_type_check
      check (
        request_type is null or
        request_type = any (array['analysis'::text, 'prep'::text, 'render_standard'::text, 'render_high'::text])
      );
  end if;
end
$$;

create or replace function public.get_design_token_balance()
returns jsonb
language sql
stable
security invoker
set search_path to 'public'
as $$
  select jsonb_build_object(
    'total', (
      coalesce(sum(amount) filter (
        where token_class = 'paid'
          and (expires_at is null or expires_at > now())
      ), 0) +
      coalesce(sum(amount) filter (
        where token_class in ('bonus', 'free')
          and (expires_at is null or expires_at > now())
      ), 0)
    )::integer,
    'paid',  coalesce(sum(amount) filter (
               where token_class = 'paid'
                 and (expires_at is null or expires_at > now())
             ), 0)::integer,
    'bonus', coalesce(sum(amount) filter (
               where token_class in ('bonus', 'free')
                 and (expires_at is null or expires_at > now())
             ), 0)::integer
  )
  from public.design_tokens
  where user_id = auth.uid();
$$;

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
  if p_request_type = 'prep' and p_ai_model != 'openai' then
    raise exception 'prep request_type is only supported for openai: %', p_ai_model;
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
  where user_id = p_user_id
    and token_class in ('bonus', 'free')
    and (expires_at is null or expires_at > now());
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
