-- =============================================================
-- 주문 완료/취소 시 관련 이미지에 expires_at 설정 트리거 + pg_cron 등록
-- =============================================================

-- 트리거 함수
-- SECURITY DEFINER 사용 이유: 주문 소유자가 아닌 admin이 상태를 변경할 수 있으며,
-- images 테이블의 다른 사용자 레코드를 업데이트해야 하기 때문.
CREATE OR REPLACE FUNCTION public.set_image_expiry_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('완료', '취소') AND OLD.status NOT IN ('완료', '취소') THEN
    UPDATE public.images
    SET expires_at = now() + interval '90 days'
    WHERE entity_id = NEW.id::text
      AND entity_type IN ('custom_order', 'reform')
      AND expires_at IS NULL
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_image_expiry
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_image_expiry_on_order_complete();

-- pg_cron 등록: 매일 KST 04:30 (UTC 19:30) 만료 이미지 정리
-- ※ SUPABASE_URL, SERVICE_ROLE_KEY는 프로젝트별 실제 값으로 대체 필요.
--   Supabase Dashboard > Project Settings > API 에서 확인 후 아래 값을 교체한다.
SELECT cron.schedule(
  'cleanup_expired_images',
  '30 19 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/cleanup-expired-images',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
