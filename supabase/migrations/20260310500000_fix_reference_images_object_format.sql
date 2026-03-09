update order_items
set reform_data = reform_data || jsonb_build_object(
  'reference_images',
  (
    select jsonb_agg(
      case
        when jsonb_typeof(elem) = 'string' then
          jsonb_build_object('url', elem#>>'{}', 'file_id', null)
        when jsonb_typeof(elem) = 'object' and elem ? 'fileId' then
          (elem - 'fileId') || jsonb_build_object('file_id', elem->>'fileId')
        else elem
      end
    )
    from jsonb_array_elements(reform_data->'reference_images') as elem
  )
)
where reform_data ? 'reference_images'
  and reform_data->'reference_images' <> '[]'::jsonb;
