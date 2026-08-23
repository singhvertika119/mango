-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.files enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.notes enable row level security;
alter table public.links enable row level security;
alter table public.code_snippets enable row level security;
alter table public.integrations enable row level security;
alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_actions enable row level security;
alter table public.approvals enable row level security;
alter table public.activities enable row level security;

-- ==========================================
-- 1. Profiles Table Policies
-- ==========================================
create policy "Allow read access to profiles for authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Allow users to update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ==========================================
-- 2. Workspaces Table Policies
-- ==========================================
create policy "Members can read workspaces"
  on public.workspaces for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.profile_id = auth.uid()
    )
  );

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  to authenticated
  with check (true);

create policy "Owners and Admins can update workspaces"
  on public.workspaces for update
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.profile_id = auth.uid()
      and workspace_members.role in ('OWNER', 'ADMIN')
    )
  );

-- ==========================================
-- 3. Workspace Members Table Policies
-- ==========================================
create policy "Members can view workspace membership"
  on public.workspace_members for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members as self
      where self.workspace_id = workspace_members.workspace_id
      and self.profile_id = auth.uid()
    )
  );

create policy "Owners and Admins can manage members"
  on public.workspace_members for all
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members as self
      where self.workspace_id = workspace_members.workspace_id
      and self.profile_id = auth.uid()
      and self.role in ('OWNER', 'ADMIN')
    )
  );

-- ==========================================
-- 4. Projects Table Policies
-- ==========================================
create policy "Members can view projects"
  on public.projects for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = projects.workspace_id
      and workspace_members.profile_id = auth.uid()
    )
  );

create policy "Owners, Admins, Members can create projects"
  on public.projects for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = projects.workspace_id
      and workspace_members.profile_id = auth.uid()
      and workspace_members.role in ('OWNER', 'ADMIN', 'MEMBER')
    )
  );

create policy "Owners, Admins, Members can update projects"
  on public.projects for update
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = projects.workspace_id
      and workspace_members.profile_id = auth.uid()
      and workspace_members.role in ('OWNER', 'ADMIN', 'MEMBER')
    )
  );

create policy "Owners and Admins can delete projects"
  on public.projects for delete
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = projects.workspace_id
      and workspace_members.profile_id = auth.uid()
      and workspace_members.role in ('OWNER', 'ADMIN')
    )
  );

-- ==========================================
-- Generic Member Checking Helper
-- ==========================================
-- Returns true if current user is an OWNER, ADMIN, or MEMBER of workspace
create or replace function public.is_workspace_active_member(workspace_id uuid)
returns boolean
security definer
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

-- Returns true if current user is any member (including VIEWER) of workspace
create or replace function public.is_workspace_any_member(workspace_id uuid)
returns boolean
security definer
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

-- Returns true if current user is OWNER or ADMIN of workspace
create or replace function public.is_workspace_manager(workspace_id uuid)
returns boolean
security definer
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

-- ==========================================
-- 5. Tasks Table Policies
-- ==========================================
create policy "Members can view tasks"
  on public.tasks for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can create tasks"
  on public.tasks for insert to authenticated
  with check (public.is_workspace_active_member(workspace_id));

create policy "Active members can update tasks"
  on public.tasks for update to authenticated
  using (public.is_workspace_active_member(workspace_id));

create policy "Workspace managers can delete tasks"
  on public.tasks for delete to authenticated
  using (public.is_workspace_manager(workspace_id));

-- ==========================================
-- 6. Files Table Policies
-- ==========================================
create policy "Members can view files"
  on public.files for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can upload files"
  on public.files for insert to authenticated
  with check (public.is_workspace_active_member(workspace_id));

create policy "Workspace managers can delete files"
  on public.files for delete to authenticated
  using (public.is_workspace_manager(workspace_id));

-- ==========================================
-- 7. Documents Table Policies
-- ==========================================
create policy "Members can view documents"
  on public.documents for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can manage documents"
  on public.documents for all to authenticated
  using (public.is_workspace_active_member(workspace_id));

-- ==========================================
-- 8. Document Chunks Table Policies
-- ==========================================
create policy "Members can view document chunks"
  on public.document_chunks for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can manage document chunks"
  on public.document_chunks for all to authenticated
  using (public.is_workspace_active_member(workspace_id));

-- ==========================================
-- 9. Notes Table Policies
-- ==========================================
create policy "Members can view notes"
  on public.notes for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can manage notes"
  on public.notes for all to authenticated
  using (public.is_workspace_active_member(workspace_id));

-- ==========================================
-- 10. Links Table Policies
-- ==========================================
create policy "Members can view links"
  on public.links for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can manage links"
  on public.links for all to authenticated
  using (public.is_workspace_active_member(workspace_id));

-- ==========================================
-- 11. Code Snippets Table Policies
-- ==========================================
create policy "Members can view snippets"
  on public.code_snippets for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can manage snippets"
  on public.code_snippets for all to authenticated
  using (public.is_workspace_active_member(workspace_id));

-- ==========================================
-- 12. Integrations Table Policies
-- ==========================================
create policy "Members can view integrations"
  on public.integrations for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Workspace managers can manage integrations"
  on public.integrations for all to authenticated
  using (public.is_workspace_manager(workspace_id));

-- ==========================================
-- 13. Agent Sessions Table Policies
-- ==========================================
create policy "Members can view agent sessions"
  on public.agent_sessions for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can manage agent sessions"
  on public.agent_sessions for all to authenticated
  using (public.is_workspace_active_member(workspace_id));

-- ==========================================
-- 14. Agent Messages Table Policies
-- ==========================================
create policy "Members can view agent messages"
  on public.agent_messages for select to authenticated
  using (
    exists (
      select 1 from public.agent_sessions
      where agent_sessions.id = agent_messages.session_id
      and public.is_workspace_any_member(agent_sessions.workspace_id)
    )
  );

create policy "Active members can insert agent messages"
  on public.agent_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.agent_sessions
      where agent_sessions.id = agent_messages.session_id
      and public.is_workspace_active_member(agent_sessions.workspace_id)
    )
  );

-- ==========================================
-- 15. Agent Actions Table Policies
-- ==========================================
create policy "Members can view agent actions"
  on public.agent_actions for select to authenticated
  using (
    exists (
      select 1 from public.agent_sessions
      where agent_sessions.id = agent_actions.session_id
      and public.is_workspace_any_member(agent_sessions.workspace_id)
    )
  );

create policy "Active members can manage agent actions"
  on public.agent_actions for all to authenticated
  using (
    exists (
      select 1 from public.agent_sessions
      where agent_sessions.id = agent_actions.session_id
      and public.is_workspace_active_member(agent_sessions.workspace_id)
    )
  );

-- ==========================================
-- 16. Approvals Table Policies
-- ==========================================
create policy "Members can view approvals"
  on public.approvals for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can manage approvals"
  on public.approvals for all to authenticated
  using (public.is_workspace_active_member(workspace_id));

-- ==========================================
-- 17. Activities Table Policies
-- ==========================================
create policy "Members can view activities"
  on public.activities for select to authenticated
  using (public.is_workspace_any_member(workspace_id));

create policy "Active members can log activities"
  on public.activities for insert to authenticated
  with check (public.is_workspace_active_member(workspace_id));
