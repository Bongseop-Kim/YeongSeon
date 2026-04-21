insert into storage.buckets (id, name, public)
values ('design-assets', 'design-assets', false)
on conflict (id) do nothing;

create policy "design_assets_own_folder_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'design-assets'
    and name like auth.uid()::text || '/%'
  );

create policy "design_assets_own_folder_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'design-assets'
    and name like auth.uid()::text || '/%'
  );
