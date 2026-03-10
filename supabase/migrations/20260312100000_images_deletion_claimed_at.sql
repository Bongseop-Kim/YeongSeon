-- 20260312100000_images_deletion_claimed_at.sql
-- images 테이블에 deletion_claimed_at 컬럼 추가
-- cleanup-expired-images Edge Function이 ImageKit 삭제 전에 행을 claim하여
-- 삭제 후 DB 업데이트가 실패하더라도 다음 실행에서 재시도할 수 있게 한다.

ALTER TABLE public.images
  ADD COLUMN deletion_claimed_at timestamptz;

COMMENT ON COLUMN public.images.deletion_claimed_at IS
  'ImageKit 삭제 시도 전 claim 시각. NOT NULL이고 deleted_at IS NULL이면 이전 실행에서 삭제를 시도했으나 DB 업데이트가 실패한 상태이다.';

CREATE INDEX idx_images_deletion_claimed
  ON public.images (deletion_claimed_at)
  WHERE deletion_claimed_at IS NOT NULL AND deleted_at IS NULL;
