-- design_tokens.token_class DEFAULT 제거
-- DEFAULT 'paid'가 있으면 token_class를 누락한 INSERT가 자동으로 paid로 채워져 버그가 숨겨진다.
-- 모든 INSERT 경로에서 token_class를 명시적으로 지정하도록 강제한다.
ALTER TABLE public.design_tokens ALTER COLUMN token_class DROP DEFAULT;
