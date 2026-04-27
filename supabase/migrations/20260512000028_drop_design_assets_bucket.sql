drop policy if exists "design_assets_own_folder_write" on storage.objects;

drop policy if exists "design_assets_own_folder_read" on storage.objects;

delete from storage.objects
where bucket_id = 'design-assets';

delete from storage.buckets
where id = 'design-assets';
