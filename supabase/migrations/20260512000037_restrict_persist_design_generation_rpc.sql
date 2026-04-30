CREATE OR REPLACE FUNCTION public.persist_design_generation(
  generation jsonb,
  variants jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  v_user_id uuid := (generation->>'user_id')::uuid;
  v_variant jsonb;
BEGIN
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  IF jsonb_typeof(variants) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'persist_design_generation variants must be an array';
  END IF;

  IF jsonb_array_length(variants) < 1 THEN
    RAISE EXCEPTION 'persist_design_generation requires at least 1 variant';
  END IF;

  IF jsonb_array_length(variants) > 4 THEN
    RAISE EXCEPTION 'persist_design_generation supports at most 4 variants';
  END IF;

  INSERT INTO public.design_generations (
    id,
    user_id,
    prompt,
    pattern_type,
    fabric_type,
    request_metadata
  )
  VALUES (
    (generation->>'id')::uuid,
    v_user_id,
    generation->>'prompt',
    generation->>'pattern_type',
    generation->>'fabric_type',
    COALESCE(generation->'request_metadata', '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      prompt = EXCLUDED.prompt,
      pattern_type = EXCLUDED.pattern_type,
      fabric_type = EXCLUDED.fabric_type,
      request_metadata = EXCLUDED.request_metadata,
      updated_at = now();

  FOR v_variant IN
    SELECT *
    FROM jsonb_array_elements(variants)
  LOOP
    INSERT INTO public.design_generation_variants (
      id,
      generation_id,
      variant_index,
      repeat_tile_url,
      repeat_tile_work_id,
      accent_tile_url,
      accent_tile_work_id,
      accent_layout_json,
      pattern_type,
      fabric_type
    )
    VALUES (
      (v_variant->>'id')::uuid,
      (generation->>'id')::uuid,
      (v_variant->>'variant_index')::int,
      v_variant->>'repeat_tile_url',
      v_variant->>'repeat_tile_work_id',
      v_variant->>'accent_tile_url',
      v_variant->>'accent_tile_work_id',
      NULLIF(v_variant->'accent_layout_json', 'null'::jsonb),
      v_variant->>'pattern_type',
      v_variant->>'fabric_type'
    )
    ON CONFLICT (id) DO UPDATE
    SET generation_id = EXCLUDED.generation_id,
        variant_index = EXCLUDED.variant_index,
        repeat_tile_url = EXCLUDED.repeat_tile_url,
        repeat_tile_work_id = EXCLUDED.repeat_tile_work_id,
        accent_tile_url = EXCLUDED.accent_tile_url,
        accent_tile_work_id = EXCLUDED.accent_tile_work_id,
        accent_layout_json = EXCLUDED.accent_layout_json,
        pattern_type = EXCLUDED.pattern_type,
        fabric_type = EXCLUDED.fabric_type;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.persist_design_generation(jsonb, jsonb)
  IS 'SECURITY DEFINER is required because design generation writes are exposed only through this RPC without direct table insert grants; EXECUTE is restricted to service_role, and authenticated callers must still own generation.user_id through auth.uid() if the grant is broadened later.';

REVOKE EXECUTE ON FUNCTION public.persist_design_generation(jsonb, jsonb)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_design_generation(jsonb, jsonb)
  TO service_role;
