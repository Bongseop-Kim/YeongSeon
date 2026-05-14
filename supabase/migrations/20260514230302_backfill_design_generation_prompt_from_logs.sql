with first_variant_logs as (
  select distinct on (dgv.generation_id)
    dgv.generation_id,
    nullif(btrim(l.user_message), '') as user_message
  from public.design_generation_variants dgv
  join public.ai_generation_logs l
    on l.work_id = dgv.repeat_tile_work_id
  where nullif(btrim(l.user_message), '') is not null
  order by dgv.generation_id, dgv.variant_index
)
update public.design_generations g
set prompt = first_variant_logs.user_message,
    updated_at = now()
from first_variant_logs
where g.id = first_variant_logs.generation_id
  and g.prompt is distinct from first_variant_logs.user_message;
