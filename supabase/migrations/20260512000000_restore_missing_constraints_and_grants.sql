-- products.price >= 0 보호 제약조건 복원
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_price_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE "public"."products" ADD CONSTRAINT "products_price_check" CHECK (("price" >= 0)) NOT VALID;
    ALTER TABLE "public"."products" VALIDATE CONSTRAINT "products_price_check";
  END IF;
END $$;

-- ai_generation_logs phase/request_type 정합성 제약조건 복원
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_ai_generation_phase_request_type'
      AND conrelid = 'public.ai_generation_logs'::regclass
  ) THEN
    ALTER TABLE "public"."ai_generation_logs" ADD CONSTRAINT "chk_ai_generation_phase_request_type" CHECK (
      (phase = 'analysis' AND request_type = 'analysis') OR
      (phase = 'render' AND request_type IN ('render_standard', 'render_high'))
    ) NOT VALID;
    ALTER TABLE "public"."ai_generation_logs" VALIDATE CONSTRAINT "chk_ai_generation_phase_request_type";
  END IF;
END $$;

-- product_likes anon/authenticated SELECT 권한 복원 (좋아요 수 조회용)
grant select on table "public"."product_likes" to "anon";
grant select on table "public"."product_likes" to "authenticated";
