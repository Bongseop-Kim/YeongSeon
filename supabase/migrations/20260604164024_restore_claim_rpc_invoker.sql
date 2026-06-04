GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT SELECT, INSERT ON TABLE public.claims TO authenticated;

ALTER FUNCTION public.create_claim(text, uuid, text, text, text, integer)
SECURITY INVOKER;

COMMENT ON FUNCTION public.create_claim(text, uuid, text, text, text, integer)
IS 'create_claim runs as SECURITY INVOKER so authenticated callers use table grants plus RLS ownership policies while the RPC validates order ownership and claim business rules.';
