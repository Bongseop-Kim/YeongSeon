-- migrate existing order_items.reform_data rows from reference_image_urls to reference_images
update order_items
set reform_data = (reform_data - 'reference_image_urls') || jsonb_build_object('reference_images', reform_data->'reference_image_urls')
where reform_data ? 'reference_image_urls';
