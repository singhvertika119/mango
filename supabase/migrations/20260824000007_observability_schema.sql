-- 1. Create System Logs Table
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  level text not null, -- 'info', 'warn', 'error'
  component text not null, -- 'rag', 'groq', 'auth', 'oauth', 'mcp', 'agent'
  message text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.system_logs enable row level security;

-- 3. Create RLS Policies (Allow all logged-in profiles to read system errors for debugging)
create policy "Authenticated users can select system logs"
  on public.system_logs for select
  using (auth.role() = 'authenticated');

create policy "Service role and agents can insert logs"
  on public.system_logs for insert
  with check (true);

-- 4. Create performance indexes
create index if not exists system_logs_workspace_level_idx
  on public.system_logs (workspace_id, level);
