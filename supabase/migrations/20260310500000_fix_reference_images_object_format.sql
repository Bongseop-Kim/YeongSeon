-- Pre-migration check: run this query to find rows with fileId but missing url before executing the migration.
-- SELECT id, reform_data->'reference_images' FROM order_items
-- WHERE reform_data ? 'reference_images'
--   AND EXISTS (
--     SELECT 1 FROM jsonb_array_elements(reform_data->'reference_images') elem
--     WHERE jsonb_typeof(elem) = 'object' AND elem ? 'fileId' AND NOT (elem ? 'url')
--   );

update order_items
set reform_data = reform_data || jsonb_build_object(
  'reference_images',
  (
    select jsonb_agg(
      case
        when jsonb_typeof(elem) = 'string' then
          jsonb_build_object('url', elem#>>'{}', 'file_id', null)
        when jsonb_typeof(elem) = 'object' and elem ? 'fileId' then
          (elem - 'fileId' - 'url') || jsonb_build_object('file_id', elem->>'fileId', 'url', coalesce(elem->>'url', ''))
        else elem
      end
    )
    from jsonb_array_elements(reform_data->'reference_images') as elem
  )
)
where reform_data ? 'reference_images'
  and reform_data->'reference_images' <> '[]'::jsonb;
