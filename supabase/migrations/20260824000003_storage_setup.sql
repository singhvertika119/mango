-- 1. Create storage bucket for project files if not exists
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (Pre-enabled by default in Supabase; comment out if permission error occurs)
-- alter table storage.objects enable row level security;

-- 2. Define Storage RLS Policies based on project/workspace membership
-- The folder structure is workspace/{workspaceId}/project/{projectId}/{fileId}
-- So path splits to: (regexp_split_to_array(name, '/'))[2] as workspace_id

create policy "Members can view project files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-files'
    and (regexp_split_to_array(name, '/'))[1] = 'workspace'
    and public.is_workspace_any_member(((regexp_split_to_array(name, '/'))[2])::uuid)
  );

create policy "Active members can upload project files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-files'
    and (regexp_split_to_array(name, '/'))[1] = 'workspace'
    and public.is_workspace_active_member(((regexp_split_to_array(name, '/'))[2])::uuid)
  );

create policy "Workspace managers can delete project files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-files'
    and (regexp_split_to_array(name, '/'))[1] = 'workspace'
    and public.is_workspace_manager(((regexp_split_to_array(name, '/'))[2])::uuid)
  );
