-- Disk I/O Optimization Migration
-- Creates composite B-Tree indexes matching high-frequency query ordering to prevent full-table disk scans

-- 1. Notifications: Sorted by workspace, user, and descending creation time
create index if not exists idx_notifications_ws_user_created
  on public.notifications (workspace_id, user_id, created_at desc);

-- 2. Activities: Fast retrieval for dashboard activity streams
create index if not exists idx_activities_ws_created
  on public.activities (workspace_id, created_at desc);

-- 3. Tasks: Filter by workspace and status/updates
create index if not exists idx_tasks_ws_status
  on public.tasks (workspace_id, status);

create index if not exists idx_tasks_ws_updated
  on public.tasks (workspace_id, updated_at desc);

-- 4. Canvas Documents: Fast multi-board lookup
create index if not exists idx_canvas_docs_ws_updated
  on public.canvas_documents (workspace_id, updated_at desc);

-- 5. Knowledge Base Documents & Chunks
create index if not exists idx_documents_ws_updated
  on public.documents (workspace_id, updated_at desc);

create index if not exists idx_doc_chunks_ws_proj
  on public.document_chunks (workspace_id, project_id);
