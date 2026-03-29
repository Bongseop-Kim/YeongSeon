-- user_coupons_status_check 제약 조건에 'reserved' 상태 보장
--
-- 배경:
--   'reserved' 상태는 20260307240000 마이그레이션에서 추가되었으나,
--   해당 파일은 20260317000000_squash.sql에 합쳐지며 삭제되었다.
--   squash의 CREATE TABLE IF NOT EXISTS는 이미 존재하는 테이블의
--   제약 조건을 수정하지 않으므로, squash 이전에 생성된 DB에서는
--   'reserved'가 없는 구 제약 조건이 그대로 남아 있다.
--
-- 영향:
--   create_order_txn / create_custom_order_txn / create_sample_order_txn에서
--   쿠폰 예약 시 UPDATE user_coupons SET status = 'reserved' 가 실패함.

ALTER TABLE public.user_coupons DROP CONSTRAINT user_coupons_status_check;
ALTER TABLE public.user_coupons ADD CONSTRAINT user_coupons_status_check
  CHECK (status = ANY (ARRAY['active', 'used', 'expired', 'revoked', 'reserved']));
