-- 20260320000000_remove_package_bonus_tokens.sql의 UPDATE에서
-- bonus_amount 키가 없을 때 amount가 NULL로 설정될 수 있는 버그 방어.
-- NULL이 된 경우에만 마이그레이션 주석 기준값(Starter:30, Popular:135, Pro:350)으로 복원한다.
UPDATE pricing_constants
SET amount = CASE key
  WHEN 'token_plan_starter_amount' THEN 30
  WHEN 'token_plan_popular_amount' THEN 135
  WHEN 'token_plan_pro_amount'     THEN 350
END
WHERE key IN ('token_plan_starter_amount', 'token_plan_popular_amount', 'token_plan_pro_amount')
  AND amount IS NULL;
