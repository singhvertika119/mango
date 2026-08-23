-- Drop old recursive policies
drop policy if exists "Members can read workspaces" on public.workspaces;
drop policy if exists "Owners and Admins can update workspaces" on public.workspaces;
drop policy if exists "Members can view workspace membership" on public.workspace_members;
drop policy if exists "Owners and Admins can manage members" on public.workspace_members;
drop policy if exists "Members can view projects" on public.projects;
drop policy if exists "Owners, Admins, Members can create projects" on public.projects;
drop policy if exists "Owners, Admins, Members can update projects" on public.projects;
drop policy if exists "Owners and Admins can delete projects" on public.projects;

-- Re-create helper functions to ensure they have correct search_path and security properties
create or replace function public.is_workspace_any_member(workspace_id uuid)
returns boolean
security definer set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = is_workspace_any_member.workspace_id
    and workspace_members.profile_id = auth.uid()
  );
end;
$$;

create or replace function public.is_workspace_active_member(workspace_id uuid)
returns boolean
security definer set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = is_workspace_active_member.workspace_id
    and workspace_members.profile_id = auth.uid()
    and workspace_members.role in ('OWNER', 'ADMIN', 'MEMBER')
  );
end;
$$;

create or replace function public.is_workspace_manager(workspace_id uuid)
returns boolean
security definer set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = is_workspace_manager.workspace_id
    and workspace_members.profile_id = auth.uid()
    and workspace_members.role in ('OWNER', 'ADMIN')
  );
end;
$$;

-- Re-apply workspaces policies using non-recursive helper functions
create policy "Members can read workspaces"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_any_member(id));

create policy "Owners and Admins can update workspaces"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_manager(id));

-- Re-apply workspace_members policies using helper functions
create policy "Members can view workspace membership"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Owners and Admins can manage members"
  on public.workspace_members for all
  to authenticated
  using (public.is_workspace_manager(workspace_id));

-- Re-apply projects policies using helper functions
create policy "Members can view projects"
  on public.projects for select
  to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Owners, Admins, Members can create projects"
  on public.projects for insert
  to authenticated
  with check (public.is_workspace_active_member(workspace_id));

create policy "Owners, Admins, Members can update projects"
  on public.projects for update
  to authenticated
  using (public.is_workspace_active_member(workspace_id));

create policy "Owners and Admins can delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_workspace_manager(workspace_id));
