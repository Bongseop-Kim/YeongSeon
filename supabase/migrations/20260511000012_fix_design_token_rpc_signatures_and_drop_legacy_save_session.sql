drop function if exists public.save_design_session(uuid, text, text, text, text, jsonb);

drop function if exists public.use_design_tokens(uuid, text, text, text);
drop function if exists public.use_design_tokens(uuid, text, text, text, text);

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
  if p_request_type not in ('analysis', 'render_standard', 'render_high') then
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

  if p_request_type not in ('analysis', 'render_standard', 'render_high') then
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
