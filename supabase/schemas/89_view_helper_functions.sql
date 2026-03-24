-- =============================================================
-- 89_view_helper_functions.sql  –  Helper functions used by views
-- =============================================================

-- Aggregates like counts per product (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.product_like_counts_rpc()
RETURNS TABLE (product_id integer, likes integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    pl.product_id,
    count(*)::int as likes
  from public.product_likes pl
  group by pl.product_id;
$$;

-- Checks if the current user liked a product
CREATE OR REPLACE FUNCTION public.product_is_liked_rpc(p_id integer)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  select exists (
    select 1
    from public.product_likes pl
    where pl.product_id = p_id
      and pl.user_id = auth.uid()
  );
$$;

-- ── admin_get_email ────────────────────────────────────────
-- Returns auth.users.email for admins only; NULL otherwise.
CREATE OR REPLACE FUNCTION public.admin_get_email(uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND public.is_admin()
    THEN (SELECT email FROM auth.users WHERE id = uid)
    ELSE NULL
  END;
$$;

-- ── get_order_admin_actions ───────────────────────────────────
-- 순수 함수: DB 조회 없음. 주어진 order_type + status에서
-- 어드민이 수행 가능한 액션 목록을 반환한다.
-- advance: 다음 상태로 진행, rollback: 이전 상태로 롤백, cancel: 취소 처리
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
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
      WHEN '접수'     THEN ARRAY['advance', 'rollback', 'cancel']
      WHEN '제작중'   THEN ARRAY['advance', 'rollback']
      WHEN '배송중'   THEN ARRAY['advance']
      WHEN '배송완료' THEN ARRAY['advance']
      ELSE ARRAY[]::text[]
    END

    WHEN p_order_type = 'repair' THEN CASE p_status
      WHEN '대기중'   THEN ARRAY['advance', 'cancel']
      WHEN '결제중'   THEN ARRAY['rollback', 'cancel']
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

-- ── get_order_customer_actions ────────────────────────────────
-- STABLE: order_id 전달 시 claims 테이블 조회.
-- 고객이 주문에 대해 수행 가능한 액션 목록을 반환한다.
-- claim_cancel / claim_return / claim_exchange / confirm_purchase
CREATE OR REPLACE FUNCTION public.get_order_customer_actions(
  p_order_type text,
  p_status     text,
  p_order_id   uuid DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
declare
  v_actions          text[] := ARRAY[]::text[];
  v_has_active_claim boolean := false;
begin
  IF (p_order_type = 'sale'   AND p_status IN ('대기중', '진행중'))
  OR (p_order_type = 'custom' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'sample' AND p_status IN ('대기중', '접수'))
  OR (p_order_type = 'repair' AND p_status = '대기중')
  OR (p_order_type = 'token'  AND p_status = '대기중')
  THEN
    v_actions := v_actions || ARRAY['claim_cancel'];
  END IF;

  IF p_order_type = 'sale' AND p_status IN ('배송중', '배송완료') THEN
    v_actions := v_actions || ARRAY['claim_return', 'claim_exchange'];
  END IF;

  IF p_order_type <> 'token' AND p_status IN ('배송중', '배송완료') THEN
    IF p_order_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.order_id = p_order_id
          AND c.status IN ('접수', '처리중', '수거요청', '수거완료', '재발송')
      ) INTO v_has_active_claim;

      IF NOT v_has_active_claim THEN
        v_actions := v_actions || ARRAY['confirm_purchase'];
      END IF;
    ELSE
      v_actions := v_actions || ARRAY['confirm_purchase'];
    END IF;
  END IF;

  RETURN v_actions;
end;
$$;

-- Returns products with options, likes, isLiked by id array
CREATE OR REPLACE FUNCTION public.get_products_by_ids(p_ids integer[])
RETURNS TABLE (
  id            integer,
  code          character varying,
  name          character varying,
  price         integer,
  image         text,
  "detailImages" text[],
  category      character varying,
  color         character varying,
  pattern       character varying,
  material      character varying,
  info          text,
  created_at    timestamp with time zone,
  updated_at    timestamp with time zone,
  options       jsonb,
  likes         integer,
  "isLiked"     boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  select
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images as "detailImages",
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.id::text,
          'name', po.name,
          'additionalPrice', po.additional_price
        )
        order by po.id
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(lc.likes, 0) as likes,
    coalesce(public.product_is_liked_rpc(p.id), false) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join product_like_counts_rpc() lc on lc.product_id = p.id
  where p.id = any (p_ids)
  group by
    p.id, p.code, p.name, p.price, p.image, p.detail_images,
    p.category, p.color, p.pattern, p.material, p.info,
    p.created_at, p.updated_at, lc.likes
  order by p.id;
$$;
