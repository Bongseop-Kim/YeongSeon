-- =============================================================
-- Claims shipping workflow: return/resend tracking + extended statuses
-- =============================================================

-- 1a. Add return/resend courier columns
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS return_courier_company text,
  ADD COLUMN IF NOT EXISTS return_tracking_number text,
  ADD COLUMN IF NOT EXISTS resend_courier_company text,
  ADD COLUMN IF NOT EXISTS resend_tracking_number text;

-- 1b. Extend status CHECK (add 수거요청, 수거완료, 재발송)
ALTER TABLE public.claims DROP CONSTRAINT claims_status_check;
ALTER TABLE public.claims ADD CONSTRAINT claims_status_check
  CHECK (status = ANY (ARRAY[
    '접수','처리중','수거요청','수거완료','재발송','완료','거부'
  ]));

-- 1c. Recreate active-claim unique index with extended status list
DROP INDEX IF EXISTS idx_claims_active_per_item;
CREATE UNIQUE INDEX idx_claims_active_per_item
  ON public.claims (order_item_id, type)
  WHERE status = ANY (ARRAY['접수','처리중','수거요청','수거완료','재발송']);

-- 1d. Extend GRANT so admin can update new columns
REVOKE UPDATE ON TABLE public.claims FROM authenticated;
GRANT UPDATE (status, return_courier_company, return_tracking_number,
              resend_courier_company, resend_tracking_number)
  ON TABLE public.claims TO authenticated;

-- 1e. Recreate create_claim with extended active-status list
CREATE OR REPLACE FUNCTION public.create_claim(
  p_type text,
  p_order_id uuid,
  p_item_id text,
  p_reason text,
  p_description text DEFAULT NULL,
  p_quantity integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order_item record;
  v_claim_quantity integer;
  v_claim_number text;
  v_claim_id uuid;
begin
  -- 1. Auth check
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- 2. Type validation
  if p_type not in ('cancel', 'return', 'exchange') then
    raise exception 'Invalid claim type';
  end if;

  -- 3. Reason validation
  if p_reason not in (
    'change_mind', 'defect', 'delay', 'wrong_item',
    'size_mismatch', 'color_mismatch', 'other'
  ) then
    raise exception 'Invalid claim reason';
  end if;

  -- 4. Order ownership check
  if not exists (
    select 1
    from orders
    where id = p_order_id
      and user_id = v_user_id
  ) then
    raise exception 'Order not found';
  end if;

  -- 5. Order item lookup (p_item_id is order_items.item_id text)
  begin
    select oi.id, oi.quantity
    into strict v_order_item
    from order_items oi
    where oi.item_id = p_item_id
      and oi.order_id = p_order_id;
  exception
    when no_data_found then
      raise exception 'Order item not found';
    when too_many_rows then
      raise exception 'Multiple order items found for given order_id and item_id';
  end;

  -- 6. Quantity validation
  v_claim_quantity := coalesce(p_quantity, v_order_item.quantity);
  if v_claim_quantity <= 0 or v_claim_quantity > v_order_item.quantity then
    raise exception 'Invalid claim quantity';
  end if;

  -- 7. Duplicate claim pre-check (final race-safety enforced by unique index)
  if exists (
    select 1
    from claims
    where order_item_id = v_order_item.id
      and type = p_type
      and status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception 'Active claim already exists for this item';
  end if;

  -- 8. Generate claim number
  v_claim_number := generate_claim_number();

  -- 9. Insert claim (atomic conflict handling via partial unique index)
  insert into claims (
    user_id,
    order_id,
    order_item_id,
    claim_number,
    type,
    reason,
    description,
    quantity
  )
  values (
    v_user_id,
    p_order_id,
    v_order_item.id,
    v_claim_number,
    p_type,
    p_reason,
    p_description,
    v_claim_quantity
  )
  on conflict (order_item_id, type) where (status in ('접수', '처리중', '수거요청', '수거완료', '재발송'))
  do nothing
  returning id into v_claim_id;

  if v_claim_id is null then
    raise exception 'Active claim already exists for this item';
  end if;

  return jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_number', v_claim_number
  );
end;
$$;

-- 1f. Update admin_claim_list_view with shipping columns
-- Must DROP + CREATE because new columns are inserted mid-definition
DROP VIEW IF EXISTS public.admin_claim_list_view;
CREATE VIEW public.admin_claim_list_view
WITH (security_invoker = true)
AS
SELECT
  cl.id,
  cl.user_id      AS "userId",
  cl.claim_number  AS "claimNumber",
  to_char(cl.created_at, 'YYYY-MM-DD') AS date,
  cl.status,
  cl.type,
  cl.reason,
  cl.description,
  cl.quantity      AS "claimQuantity",
  cl.created_at,
  cl.updated_at,
  cl.return_courier_company  AS "returnCourierCompany",
  cl.return_tracking_number  AS "returnTrackingNumber",
  cl.resend_courier_company  AS "resendCourierCompany",
  cl.resend_tracking_number  AS "resendTrackingNumber",
  o.id             AS "orderId",
  o.order_number   AS "orderNumber",
  o.status         AS "orderStatus",
  o.courier_company AS "orderCourierCompany",
  o.tracking_number AS "orderTrackingNumber",
  o.shipped_at     AS "orderShippedAt",
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  oi.item_type     AS "itemType",
  pr.name          AS "productName"
FROM public.claims cl
JOIN public.orders o ON o.id = cl.order_id
JOIN public.order_items oi ON oi.id = cl.order_item_id
LEFT JOIN public.products pr ON pr.id = oi.product_id
LEFT JOIN public.profiles p ON p.id = cl.user_id;
