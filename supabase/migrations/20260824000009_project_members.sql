-- ==========================================
-- 20260824000009_project_members.sql
-- Granular Project-Level Sharing & Access Control
-- ==========================================

-- 1. Create Project Members Table
create table if not exists public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'EDITOR' not null check (role in ('EDITOR', 'VIEWER')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, profile_id)
);

-- Enable RLS
alter table public.project_members enable row level security;

-- Create Index for Performance
create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_profile on public.project_members(profile_id);

-- 2. Security Definer Helper Functions

-- Check if user has read access to a project (either via Workspace Membership or direct Project Membership)
create or replace function public.has_project_access(p_id uuid)
returns boolean
security definer
language plpgsql
as $$
declare
  w_id uuid;
begin
  select workspace_id into w_id from public.projects where id = p_id;
  if w_id is null then
    return false;
  end if;

  -- 1. Check workspace membership
  if exists (
    select 1 from public.workspace_members
    where workspace_id = w_id
    and profile_id = auth.uid()
  ) then
    return true;
  end if;

  -- 2. Check direct project membership
  if exists (
    select 1 from public.project_members
    where project_id = p_id
    and profile_id = auth.uid()
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- Check if user has edit/write access to a project
create or replace function public.can_edit_project(p_id uuid)
returns boolean
security definer
language plpgsql
as $$
declare
  w_id uuid;
begin
  select workspace_id into w_id from public.projects where id = p_id;
  if w_id is null then
    return false;
  end if;

  -- 1. Check workspace active member (OWNER, ADMIN, MEMBER)
  if exists (
    select 1 from public.workspace_members
    where workspace_id = w_id
    and profile_id = auth.uid()
    and role in ('OWNER', 'ADMIN', 'MEMBER')
  ) then
    return true;
  end if;

  -- 2. Check direct project membership with EDITOR role
  if exists (
    select 1 from public.project_members
    where project_id = p_id
    and profile_id = auth.uid()
    and role = 'EDITOR'
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- 3. Project Members Policies
create policy "Members can view project membership"
  on public.project_members for select
  to authenticated
  using (
    public.has_project_access(project_id)
  );

create policy "Admins and Project Editors can manage project members"
  on public.project_members for all
  to authenticated
  using (
    public.can_edit_project(project_id)
  );

-- 4. Update Projects Policies
drop policy if exists "Members can view projects" on public.projects;
create policy "Members can view projects"
  on public.projects for select
  to authenticated
  using (
    created_by = auth.uid()
    OR
    public.has_project_access(id)
  );

drop policy if exists "Owners, Admins, Members can update projects" on public.projects;
create policy "Owners, Admins, Members can update projects"
  on public.projects for update
  to authenticated
  using (
    created_by = auth.uid()
    OR
    public.can_edit_project(id)
  );

-- 5. Update Tasks Policies
drop policy if exists "Members can view tasks" on public.tasks;
create policy "Members can view tasks"
  on public.tasks for select
  to authenticated
  using (
    public.has_project_access(project_id)
  );

drop policy if exists "Members can create tasks" on public.tasks;
create policy "Members can create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.can_edit_project(project_id)
  );

drop policy if exists "Members can update tasks" on public.tasks;
create policy "Members can update tasks"
  on public.tasks for update
  to authenticated
  using (
    public.can_edit_project(project_id)
  );

drop policy if exists "Members can delete tasks" on public.tasks;
create policy "Members can delete tasks"
  on public.tasks for delete
  to authenticated
  using (
    public.can_edit_project(project_id)
  );

-- 6. Update Documents & Files Policies
drop policy if exists "Members can view documents" on public.documents;
create policy "Members can view documents"
  on public.documents for select
  to authenticated
  using (
    public.has_project_access(project_id)
  );

drop policy if exists "Members can create documents" on public.documents;
create policy "Members can create documents"
  on public.documents for insert
  to authenticated
  with check (
    public.can_edit_project(project_id)
  );

-- 7. Update Notes, Links, Snippets Policies
drop policy if exists "Members can view notes" on public.notes;
create policy "Members can view notes"
  on public.notes for select
  to authenticated
  using (
    public.has_project_access(project_id)
  );

drop policy if exists "Members can view links" on public.links;
create policy "Members can view links"
  on public.links for select
  to authenticated
  using (
    public.has_project_access(project_id)
  );

drop policy if exists "Members can view snippets" on public.code_snippets;
create policy "Members can view snippets"
  on public.code_snippets for select
  to authenticated
  using (
    public.has_project_access(project_id)
  );
