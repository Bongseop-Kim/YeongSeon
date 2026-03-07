-- ── admin_get_period_stats text overload 제거 ────────────────
-- 20260307140000 에서 생성된 (text, text, text) 오버로드를 제거한다.
-- 20260307160000 에서 생성된 (text, date, date) 오버로드가 올바른 시그니처이며,
-- PostgREST가 클라이언트의 문자열 값을 date로 암묵적으로 캐스팅한다.
-- 두 오버로드가 공존하면 (text, text, text) 가 우선 선택되어 fix가 무효화된다.
DROP FUNCTION public.admin_get_period_stats(text, text, text);
