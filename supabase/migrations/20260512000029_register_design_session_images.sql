CREATE OR REPLACE FUNCTION public.register_image(
  p_url         text,
  p_file_id     text,
  p_folder      text,
  p_entity_type text,
  p_entity_id   text,
  p_expires_at  timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_entity_type = 'product' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'quote_request' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.quote_requests qr
      WHERE qr.id::text = p_entity_id
        AND qr.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'custom_order' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'custom'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'reform' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'repair'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'design_message' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.design_chat_messages m
      JOIN public.design_chat_sessions s ON s.id = m.session_id
      WHERE m.id::text = p_entity_id
        AND s.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'design_session' THEN
    IF EXISTS (
      SELECT 1
      FROM public.design_chat_sessions s
      WHERE s.id::text = p_entity_id
        AND s.user_id <> v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END IF;

  INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at)
  VALUES (p_url, p_file_id, p_folder, p_entity_type, p_entity_id, v_user_id, p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.register_image(text, text, text, text, text, timestamptz)
IS 'Registers ImageKit uploads in public.images after verifying ownership for supported entity types, including design_session uploads for expiring design attachment cleanup.';

GRANT EXECUTE ON FUNCTION public.register_image(text, text, text, text, text, timestamptz) TO authenticated;
