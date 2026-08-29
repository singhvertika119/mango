-- 1. Drop old policies on workspaces and workspace_members
drop policy if exists "Members can read workspaces" on public.workspaces;
drop policy if exists "Owners and Admins can update workspaces" on public.workspaces;
drop policy if exists "Members can view workspace membership" on public.workspace_members;
drop policy if exists "Owners and Admins can manage members" on public.workspace_members;
drop policy if exists "Allow member insert" on public.workspace_members;
drop policy if exists "Owners and Admins can update members" on public.workspace_members;
drop policy if exists "Owners and Admins can delete members" on public.workspace_members;

-- 2. WORKSPACES SELECT Policy: allow read access if user is the creator OR is a member.
-- The creator check (created_by = auth.uid()) is critical to allow 'RETURNING *' to succeed
-- during workspace insertion before the workspace_members row is created.
create policy "Members can read workspaces"
  on public.workspaces for select
  to authenticated
  using (
    created_by = auth.uid()
    OR
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.profile_id = auth.uid()
    )
  );

create policy "Owners and Admins can update workspaces"
  on public.workspaces for update
  to authenticated
  using (
    created_by = auth.uid()
    OR
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.profile_id = auth.uid()
      and workspace_members.role in ('OWNER', 'ADMIN')
    )
  );

-- 3. WORKSPACE MEMBERS SELECT Policy: open select access to prevent circular RLS loops
create policy "Members can view workspace membership"
  on public.workspace_members for select
  to authenticated
  using (true);

-- 4. WORKSPACE MEMBERS INSERT Policy: allow if no members exist yet for the workspace (first insert), or if user is OWNER/ADMIN
create policy "Allow member insert"
  on public.workspace_members for insert
  to authenticated
  with check (
    not exists (
      select 1 from public.workspace_members as self
      where self.workspace_id = workspace_members.workspace_id
    )
    OR
    exists (
      select 1 from public.workspace_members as self
      where self.workspace_id = workspace_members.workspace_id
      and self.profile_id = auth.uid()
      and self.role in ('OWNER', 'ADMIN')
    )
  );

-- 5. WORKSPACE MEMBERS UPDATE/DELETE Policies: allow for OWNER/ADMIN roles, or if it is the creator of the workspace
create policy "Owners and Admins can update members"
  on public.workspace_members for update
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members as self
      where self.workspace_id = workspace_members.workspace_id
      and self.profile_id = auth.uid()
      and self.role in ('OWNER', 'ADMIN')
    )
  );

create policy "Owners and Admins can delete members"
  on public.workspace_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members as self
      where self.workspace_id = workspace_members.workspace_id
      and self.profile_id = auth.uid()
      and self.role in ('OWNER', 'ADMIN')
    )
  );
