DO $$
BEGIN
  IF to_regprocedure('public.generate_claim_number()') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.generate_claim_number() TO authenticated;
  END IF;
END;
$$;
