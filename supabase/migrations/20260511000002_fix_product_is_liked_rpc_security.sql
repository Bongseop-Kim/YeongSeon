CREATE OR REPLACE FUNCTION public.product_is_liked_rpc(p_id integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.product_likes pl
    WHERE pl.product_id = p_id
      AND pl.user_id = auth.uid()
  );
$$;
