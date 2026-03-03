-- replace_product_options: DELETE + INSERT in single transaction
CREATE OR REPLACE FUNCTION public.replace_product_options(
  p_product_id integer,
  p_options     jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.product_options
  WHERE product_id = p_product_id;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'p_options must be a JSON array';
  END IF;

  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO public.product_options
      (product_id, option_id, name, additional_price, stock)
    SELECT
      p_product_id,
      (elem->>'option_id')::varchar(50),
      (elem->>'name')::varchar(255),
      (elem->>'additional_price')::integer,
      CASE WHEN elem->>'stock' IS NULL THEN NULL
           ELSE (elem->>'stock')::integer END
    FROM jsonb_array_elements(p_options) AS elem;
  END IF;
END;
$$;
