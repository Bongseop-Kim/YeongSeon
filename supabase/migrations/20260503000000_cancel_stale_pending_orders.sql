-- 결제 완료 콜백 전 이탈한 주문이 대기중에 고착되지 않도록
-- 30분 이상 지난 pending 주문을 10분마다 자동 취소한다.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- SECURITY DEFINER 사용 근거:
--   pg_cron 또는 service_role만 호출하는 스케줄러 함수로,
--   public.orders UPDATE 와 public.order_status_logs INSERT 권한이 모두 필요하다.
--   외부 호출 남용을 막기 위해 service_role 또는 pg_cron(JWT 없음)만 허용한다.
CREATE OR REPLACE FUNCTION public.cancel_stale_pending_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_cancelled_count integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'unauthorized: scheduler-only function';
  end if;

  for v_order in
    select id, status
    from public.orders
    where status = '대기중'
      and created_at < now() - interval '30 minutes'
    for update skip locked
  loop
    update public.orders
    set status = '취소',
        updated_at = now()
    where id = v_order.id;

    insert into public.order_status_logs (
      order_id,
      changed_by,
      previous_status,
      new_status,
      memo
    )
    values (
      v_order.id,
      null,
      v_order.status,
      '취소',
      '자동 취소 (대기중 30분 초과)'
    );

    v_cancelled_count := v_cancelled_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'cancelled_count', v_cancelled_count
  );
end;
$$;

REVOKE ALL ON FUNCTION public.cancel_stale_pending_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_stale_pending_orders() TO service_role;

select cron.schedule(
  'cancel-stale-pending-orders',
  '*/10 * * * *',
  $$select public.cancel_stale_pending_orders();$$
)
where not exists (
  select 1
  from cron.job
  where jobname = 'cancel-stale-pending-orders'
);
