delete from public.ai_generation_log_artifacts
where phase <> 'render';

delete from public.ai_generation_logs
where phase <> 'render'
   or request_type <> 'render_standard';

alter table public.ai_generation_logs
  drop constraint if exists chk_ai_generation_phase_request_type;

alter table public.ai_generation_logs
  drop constraint if exists ai_generation_logs_phase_check,
  drop constraint if exists ai_generation_logs_request_type_check,
  drop constraint if exists ai_generation_logs_quality_check,
  drop constraint if exists ai_generation_logs_pattern_preparation_backend_check,
  drop constraint if exists ai_generation_logs_pattern_repair_prompt_kind_check;

alter table public.ai_generation_logs
  drop constraint if exists ai_generation_logs_base_image_work_id_fkey;

alter table public.ai_generation_logs
  drop column if exists eligible_for_render,
  drop column if exists missing_requirements,
  drop column if exists eligibility_reason,
  drop column if exists text_prompt,
  drop column if exists image_edit_prompt,
  drop column if exists route_reason,
  drop column if exists route_signals,
  drop column if exists base_image_work_id,
  drop column if exists seed,
  drop column if exists pattern_preparation_backend,
  drop column if exists pattern_repair_prompt_kind,
  drop column if exists pattern_repair_applied,
  drop column if exists pattern_repair_reason_codes,
  drop column if exists prep_tokens_charged;

alter table public.ai_generation_logs
  add constraint ai_generation_logs_phase_check
    check (phase = 'render'),
  add constraint ai_generation_logs_request_type_check
    check (request_type = 'render_standard'),
  add constraint ai_generation_logs_quality_check
    check (quality = 'standard'),
  add constraint chk_ai_generation_phase_request_type
    check (phase = 'render' and request_type = 'render_standard');

alter table public.ai_generation_log_artifacts
  drop constraint if exists ai_generation_log_artifacts_phase_check;

alter table public.ai_generation_log_artifacts
  add constraint ai_generation_log_artifacts_phase_check
    check (phase = 'render');

drop function if exists public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
);

create function public.admin_get_generation_logs(
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
  id                    uuid,
  workflow_id           text,
  phase                 text,
  work_id               text,
  parent_work_id        text,
  user_id               uuid,
  ai_model              text,
  request_type          text,
  quality               text,
  user_message          text,
  prompt_length         integer,
  request_attachments   jsonb,
  design_context        jsonb,
  normalized_design     jsonb,
  conversation_turn     integer,
  has_ci_image          boolean,
  has_reference_image   boolean,
  has_previous_image    boolean,
  generate_image        boolean,
  detected_design       jsonb,
  image_prompt          text,
  ai_message            text,
  image_generated       boolean,
  generated_image_url   text,
  tokens_charged        integer,
  tokens_refunded       integer,
  text_latency_ms       integer,
  image_latency_ms      integer,
  total_latency_ms      integer,
  error_type            text,
  error_message         text,
  created_at            timestamptz
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
    l.detected_design,
    l.image_prompt,
    l.ai_message,
    l.image_generated,
    l.generated_image_url,
    l.tokens_charged,
    l.tokens_refunded,
    l.text_latency_ms,
    l.image_latency_ms,
    l.total_latency_ms,
    l.error_type,
    l.error_message,
    l.created_at
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
) is 'Admin-only listing with optional filters: id / request_type / status(success|error) / id_search(workflow_id|work_id exact).';

grant execute on function public.admin_get_generation_logs(
  date, date, text, integer, integer, uuid, text, text, text
) to authenticated;

delete from public.admin_settings
where key in (
  'design_token_cost_openai_analysis',
  'design_token_cost_openai_prep',
  'design_token_cost_openai_render_high'
);

create or replace function public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,
  p_request_type text,
  p_quality      text default 'standard',
  p_work_id      text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cost_key       text;
  v_cost           integer;
  v_total_bal      integer;
  v_paid_bal       integer;
  v_bonus_bal      integer;
  v_caller_role    text;
  v_paid_deduct    integer;
  v_bonus_deduct   integer;
  v_remaining_paid integer;
  v_batch_consume  integer;
  v_batch_idx      integer;
  v_batch_row      record;
begin
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  if v_caller_role is distinct from 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized: caller does not own this resource';
  end if;

  if p_ai_model not in ('openai') then
    raise exception 'invalid ai_model: %', p_ai_model;
  end if;
  if p_request_type != 'render_standard' then
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
      and type = 'token_refund'
      and status = '접수'
  ) then
    select coalesce(sum(amount), 0) into v_total_bal
    from public.design_tokens where user_id = p_user_id;
    return jsonb_build_object(
      'success', false, 'error', 'refund_pending', 'balance', v_total_bal, 'cost', v_cost
    );
  end if;

  select
    coalesce(sum(amount), 0),
    coalesce(sum(amount) filter (where token_class = 'paid'), 0),
    coalesce(sum(amount) filter (where token_class in ('bonus','free')), 0)
  into v_total_bal, v_paid_bal, v_bonus_bal
  from public.design_tokens
  where user_id = p_user_id;

  if v_total_bal < v_cost then
    return jsonb_build_object(
      'success', false, 'error', 'insufficient_tokens', 'balance', v_total_bal, 'cost', v_cost
    );
  end if;

  v_paid_deduct := least(v_paid_bal, v_cost);
  v_bonus_deduct := v_cost - v_paid_deduct;

  if v_paid_deduct > 0 then
    insert into public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) values (
      p_user_id, -v_paid_deduct, 'use', 'paid', p_ai_model, p_request_type,
      'AI 디자인 생성 토큰 사용', p_work_id
    );
  end if;

  if v_bonus_deduct > 0 then
    v_remaining_paid := 0;
    v_batch_idx := 0;

    for v_batch_row in
      select token_class, sum(amount)::integer as balance
      from public.design_tokens
      where user_id = p_user_id and token_class in ('bonus','free')
      group by token_class
      order by case token_class when 'bonus' then 0 else 1 end
    loop
      exit when v_bonus_deduct <= 0;
      if v_batch_row.balance <= 0 then
        continue;
      end if;

      v_batch_consume := least(v_batch_row.balance, v_bonus_deduct);
      v_batch_idx := v_batch_idx + 1;

      insert into public.design_tokens (
        user_id, amount, type, token_class, ai_model, request_type, description, work_id
      ) values (
        p_user_id, -v_batch_consume, 'use', v_batch_row.token_class, p_ai_model, p_request_type,
        'AI 디자인 생성 토큰 사용',
        case
          when p_work_id is null then null
          when v_paid_deduct = 0 and v_batch_idx = 1 then p_work_id
          else p_work_id || '_bonus_' || v_batch_idx::text
        end
      );

      v_bonus_deduct := v_bonus_deduct - v_batch_consume;
    end loop;
  end if;

  select coalesce(sum(amount), 0)
  into v_total_bal
  from public.design_tokens
  where user_id = p_user_id;

  return jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal);
end;
$$;

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

  if p_ai_model not in ('openai') then
    raise exception 'invalid ai_model: %', p_ai_model;
  end if;

  if p_request_type != 'render_standard' then
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
    'AI 디자인 생성 실패 토큰 환불',
    p_work_id
  )
  on conflict (work_id) where work_id is not null do nothing;
end;
$$;
