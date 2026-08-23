-- Enable Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector" with schema public;

-- Create Enums
create type public.workspace_role as enum ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
create type public.task_status as enum ('Todo', 'In Progress', 'Review', 'Completed', 'Blocked');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.document_status as enum ('pending', 'processing', 'completed', 'failed');
create type public.agent_message_role as enum ('user', 'assistant', 'system');
create type public.action_status as enum ('pending', 'approved', 'rejected', 'executed', 'failed');
create type public.approval_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED', 'FAILED');
create type public.approval_action_type as enum ('read', 'write', 'dangerous');

-- 1. Profiles Table (References Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Workspaces Table
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Workspace Members Table
create table public.workspace_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  role public.workspace_role default 'MEMBER'::public.workspace_role not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, profile_id)
);

-- 4. Projects Table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'active' not null,
  start_date timestamp with time zone,
  target_date timestamp with time zone,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tasks Table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  status public.task_status default 'Todo'::public.task_status not null,
  priority public.task_priority default 'medium'::public.task_priority not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date timestamp with time zone,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Files Table (Metadata for items stored in Supabase Storage)
create table public.files (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  file_path text not null,
  size_bytes bigint not null,
  mime_type text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Documents Table
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  file_id uuid references public.files(id) on delete set null,
  title text not null,
  type text not null,
  status public.document_status default 'pending'::public.document_status not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Document Chunks Table (Using vector size 384 for local model all-MiniLM-L6-v2)
create table public.document_chunks (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  document_id uuid references public.documents(id) on delete cascade not null,
  content text not null,
  embedding public.vector(384),
  section text,
  chunk_index integer not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Notes Table
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Links Table
create table public.links (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  url text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Code Snippets Table
create table public.code_snippets (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  code text not null,
  language text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Integrations Table
create table public.integrations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  provider text not null,
  credentials text not null,
  settings jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, provider)
);

-- 13. Agent Sessions Table
create table public.agent_sessions (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Agent Messages Table
create table public.agent_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.agent_sessions(id) on delete cascade not null,
  role public.agent_message_role not null,
  content text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 15. Agent Actions Table
create table public.agent_actions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.agent_sessions(id) on delete cascade not null,
  message_id uuid references public.agent_messages(id) on delete cascade,
  tool_name text not null,
  parameters jsonb default '{}'::jsonb not null,
  status public.action_status default 'pending'::public.action_status not null,
  result jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 16. Approvals Table
create table public.approvals (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  agent_session_id uuid references public.agent_sessions(id) on delete cascade not null,
  agent_action_id uuid references public.agent_actions(id) on delete cascade not null,
  tool_name text not null,
  action_type public.approval_action_type default 'write'::public.approval_action_type not null,
  parameters jsonb default '{}'::jsonb not null,
  status public.approval_status default 'PENDING'::public.approval_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  resolved_by uuid references public.profiles(id) on delete set null,
  result jsonb
);

-- 17. Activities Table
create table public.activities (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Indexes for Performance
create index idx_workspace_members_profile_id on public.workspace_members(profile_id);
create index idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index idx_projects_workspace_id on public.projects(workspace_id);
create index idx_tasks_project_id on public.tasks(project_id);
create index idx_tasks_workspace_id on public.tasks(workspace_id);
create index idx_files_project_id on public.files(project_id);
create index idx_documents_project_id on public.documents(project_id);
create index idx_document_chunks_document_id on public.document_chunks(document_id);
create index idx_notes_project_id on public.notes(project_id);
create index idx_links_project_id on public.links(project_id);
create index idx_code_snippets_project_id on public.code_snippets(project_id);
create index idx_agent_sessions_project_id on public.agent_sessions(project_id);
create index idx_agent_messages_session_id on public.agent_messages(session_id);
create index idx_agent_actions_session_id on public.agent_actions(session_id);
create index idx_approvals_agent_action_id on public.approvals(agent_action_id);

-- Profile Sync Function & Trigger (Sync auth.users -> public.profiles)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
