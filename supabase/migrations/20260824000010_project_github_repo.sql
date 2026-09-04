-- ==========================================
-- 20260824000010_project_github_repo.sql
-- Add Project-Level GitHub Repository Binding
-- ==========================================

alter table public.projects 
add column if not exists github_repo text;

-- Index for searching projects by repository
create index if not exists idx_projects_github_repo on public.projects(github_repo);
