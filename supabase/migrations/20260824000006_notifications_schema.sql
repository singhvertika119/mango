-- 1. Create Notifications Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null default 'info', -- 'info', 'success', 'warning', 'approval'
  is_read boolean not null default false,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.notifications enable row level security;

-- 3. Create RLS Policies
create policy "Users can manage their own notifications"
  on public.notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Create indexes for performance
create index if not exists notifications_workspace_user_idx
  on public.notifications (workspace_id, user_id, is_read);
