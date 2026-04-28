do $$
begin
  raise notice 'One-time cleanup for deprecated design-assets bucket. Before applying this migration, delete or back up every design asset file through the Supabase Storage API or dashboard; SQL deletes only metadata rows in storage.objects and storage.buckets, not backend object files. Direct deletes from storage.objects and storage.buckets are limited to this deprecated bucket removal because the application now uses ImageKit for image storage.';
end
$$;

drop policy if exists "design_assets_own_folder_write" on storage.objects;

drop policy if exists "design_assets_own_folder_read" on storage.objects;

delete from storage.objects
where bucket_id = 'design-assets';

delete from storage.buckets
where id = 'design-assets';
