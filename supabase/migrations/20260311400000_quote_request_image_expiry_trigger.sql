-- =============================================================
-- 20260311400000_quote_request_image_expiry_trigger.sql
-- 견적 종료/확정 시 이미지 만료 설정 트리거 추가
-- =============================================================

-- 견적 종료/확정 시 이미지 만료 설정 (+90일)
-- SECURITY DEFINER: admin이 상태를 변경하는 경우 RLS bypass 필요
CREATE OR REPLACE FUNCTION public.set_image_expiry_on_quote_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('종료', '확정') AND OLD.status NOT IN ('종료', '확정') THEN
    UPDATE public.images
    SET expires_at = now() + interval '90 days'
    WHERE entity_id = NEW.id::text
      AND entity_type = 'quote_request'
      AND expires_at IS NULL
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quote_request_image_expiry
  AFTER UPDATE OF status ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_image_expiry_on_quote_complete();
