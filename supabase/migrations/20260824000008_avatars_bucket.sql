-- 1. Create public avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Define RLS Policies for avatars
create policy "Anyone can select avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars' 
    and (regexp_split_to_array(name, '/'))[1] = auth.uid()::text
  );

create policy "Users can update their own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars' 
    and (regexp_split_to_array(name, '/'))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars' 
    and (regexp_split_to_array(name, '/'))[1] = auth.uid()::text
  );
