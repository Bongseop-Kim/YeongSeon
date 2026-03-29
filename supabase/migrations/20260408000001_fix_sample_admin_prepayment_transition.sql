-- Align sample admin actions and forward transitions with payment flow.
-- Sample orders move to '접수' only through payment confirmation ('결제중' -> '접수').

CREATE OR REPLACE FUNCTION public.get_order_admin_actions(
  p_order_type text,
  p_status     text
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_status IN ('완료', '취소', '실패') THEN ARRAY[]::text[]

    WHEN p_order_type = 'sale' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '진행중'   THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'custom' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '제작완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'sample' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'repair' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['cancel']
      WHEN '결제중'   THEN ARRAY['cancel']
      WHEN '발송대기' THEN ARRAY['cancel']
      WHEN '발송중'   THEN ARRAY['advance', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback']
      WHEN '수선중'   THEN ARRAY['advance', 'rollback']
      WHEN '수선완료' THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'token' THEN CASE p_status
      WHEN '대기중' THEN ARRAY['advance', 'cancel']
      WHEN '결제중' THEN ARRAY['rollback', 'cancel']
      ELSE ARRAY[]::text[]
    END

    ELSE ARRAY[]::text[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text DEFAULT NULL::text,
  p_payment_key text DEFAULT NULL::text,
  p_is_rollback boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid := auth.uid();
  v_current_status text;
  v_order_type text;
  v_payment_key text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select status, order_type, payment_key
  into v_current_status, v_order_type, v_payment_key
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  if p_new_status is null or btrim(p_new_status) = '' then
    raise exception 'p_new_status is required';
  end if;

  if p_is_rollback and (p_memo is null or btrim(p_memo) = '') then
    raise exception 'memo is required when rollback';
  end if;

  if p_is_rollback then
    if v_current_status in ('배송중', '배송완료', '완료', '취소', '수거완료', '재발송') then
      raise exception 'Rollback not allowed from status: %', v_current_status;
    end if;

    if v_order_type = 'sale' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '진행중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '결제중'   and p_new_status = '대기중')
        or (v_current_status = '접수'   and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
        or (v_current_status = '제작완료' and p_new_status = '제작중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '접수' and p_new_status = '발송중')
        or (v_current_status = '수선중' and p_new_status = '접수')
        or (v_current_status = '수선완료' and p_new_status = '수선중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  else
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '진행중')
        or (v_current_status = '진행중'   and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'   and p_new_status = '제작중')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '접수' and p_new_status = '제작중')
        or (v_current_status = '제작중' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '발송중' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '발송대기', '발송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      if not (
        (v_current_status = '대기중' and p_new_status = '완료' and v_payment_key is not null and length(btrim(v_payment_key)) > 0)
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  end if;

  update public.orders
  set status = p_new_status,
      payment_key = case
        when v_order_type = 'token' and p_new_status = '완료' then coalesce(nullif(btrim(p_payment_key), ''), payment_key)
        else payment_key
      end,
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_admin_id, v_current_status, p_new_status, p_memo
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'order_type', v_order_type,
    'previous_status', v_current_status,
    'new_status', p_new_status,
    'is_rollback', p_is_rollback
  );
end;
$$;
