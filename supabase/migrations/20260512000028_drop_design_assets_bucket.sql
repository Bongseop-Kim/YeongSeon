do $$
begin
  raise notice 'Deprecated design-assets bucket access policies are being removed. Delete or back up every legacy design asset file and remove the bucket through the Supabase Storage API or dashboard; direct SQL deletion from storage.objects and storage.buckets is blocked by Supabase and is not part of this migration.';
end
$$;

drop policy if exists "design_assets_own_folder_write" on storage.objects;

drop policy if exists "design_assets_own_folder_read" on storage.objects;
