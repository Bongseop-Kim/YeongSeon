-- =============================================================
-- 20260324000001_drop_use_design_tokens_legacy_overloads.sql
-- squash에 남아 있는 use_design_tokens 레거시 오버로드 제거
--
-- squash 이후 3개의 오버로드가 공존:
--   1. (uuid, text, text)                         ← 레거시
--   2. (uuid, text, text, text)                   ← 레거시
--   3. (uuid, text, text, text, text)             ← 현재 최신 (유지)
--
-- 3인수 호출 시 1·2·3 모두 매칭되어 "is not unique" 에러 발생.
-- =============================================================

DROP FUNCTION IF EXISTS public.use_design_tokens(uuid, text, text);
DROP FUNCTION IF EXISTS public.use_design_tokens(uuid, text, text, text);
