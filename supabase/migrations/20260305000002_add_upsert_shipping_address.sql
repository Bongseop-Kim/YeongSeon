CREATE OR REPLACE FUNCTION public.upsert_shipping_address(
  p_recipient_name   varchar,
  p_recipient_phone  varchar,
  p_address          text,
  p_postal_code      varchar,
  p_id               uuid        DEFAULT NULL,
  p_address_detail   varchar     DEFAULT NULL,
  p_delivery_request text        DEFAULT NULL,
  p_delivery_memo    text        DEFAULT NULL,
  p_is_default       boolean     DEFAULT false
)
RETURNS SETOF shipping_addresses
LANGUAGE plpgsql
-- SECURITY INVOKER: RLS 정책(user_id = auth.uid())으로 소유권 보장
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 기본 배송지 설정 시 기존 기본 배송지 해제 (트랜잭션 내 원자적 처리)
  -- UPDATE 대상 행이 존재하는 경우에만 해제하여 기본 배송지가 없는 상태를 방지
  IF p_is_default THEN
    IF p_id IS NULL OR EXISTS(
      SELECT 1 FROM shipping_addresses WHERE id = p_id AND user_id = v_user_id
    ) THEN
      UPDATE shipping_addresses
      SET is_default = false
      WHERE user_id = v_user_id
        AND is_default = true
        AND (p_id IS NULL OR id != p_id);
    END IF;
  END IF;

  IF p_id IS NULL THEN
    -- CREATE
    RETURN QUERY
    INSERT INTO shipping_addresses (
      recipient_name, recipient_phone, address, address_detail,
      postal_code, delivery_request, delivery_memo, is_default, user_id
    ) VALUES (
      p_recipient_name, p_recipient_phone, p_address, p_address_detail,
      p_postal_code, p_delivery_request, p_delivery_memo, p_is_default, v_user_id
    )
    RETURNING *;
  ELSE
    -- UPDATE
    RETURN QUERY
    UPDATE shipping_addresses
    SET
      recipient_name   = p_recipient_name,
      recipient_phone  = p_recipient_phone,
      address          = p_address,
      address_detail   = p_address_detail,
      postal_code      = p_postal_code,
      delivery_request = p_delivery_request,
      delivery_memo    = p_delivery_memo,
      is_default       = p_is_default
    WHERE id = p_id AND user_id = v_user_id
    RETURNING *;
  END IF;
END;
$$;
