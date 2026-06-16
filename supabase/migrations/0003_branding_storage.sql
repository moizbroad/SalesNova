-- ============================================================================
-- Task 4: branding storage bucket (company logo) + policies
-- Run this once in the Supabase SQL editor.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Anyone can read the logo (public bucket).
drop policy if exists "branding_public_read" on storage.objects;
create policy "branding_public_read" on storage.objects
  for select to public
  using (bucket_id = 'branding');

-- Only admins can upload / replace / remove branding assets.
drop policy if exists "branding_admin_insert" on storage.objects;
create policy "branding_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists "branding_admin_update" on storage.objects;
create policy "branding_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'branding' and public.is_admin());

drop policy if exists "branding_admin_delete" on storage.objects;
create policy "branding_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and public.is_admin());
