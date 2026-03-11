-- get_design_token_balance: paid/bonus 잔액을 token_class별로 분리 집계
-- (이전 구현에서 paid와 total이 동일한 SUM을 사용해 bonus 토큰이 paid에 포함되던 버그 수정)

CREATE OR REPLACE FUNCTION public.get_design_token_balance()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(amount), 0)::integer,
    'paid',  COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    'bonus', COALESCE(SUM(amount) FILTER (WHERE token_class = 'bonus'), 0)::integer
  )
  FROM public.design_tokens
  WHERE user_id = auth.uid();
$$;
