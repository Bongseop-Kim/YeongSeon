ALTER FUNCTION public.create_claim(text, uuid, text, text, text, integer)
SECURITY DEFINER;

COMMENT ON FUNCTION public.create_claim(text, uuid, text, text, text, integer)
IS 'SECURITY DEFINER is required so authenticated users create claims only through RPC validations after direct table INSERT is revoked; function still checks auth.uid() ownership and claim business rules.';

REVOKE INSERT ON TABLE public.claims FROM authenticated;
