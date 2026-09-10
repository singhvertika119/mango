-- ==============================================================================
-- 20260824000011_canvas_documents.sql
-- Table: canvas_documents for Eraser.io style dual-pane visual docs & diagrams
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.canvas_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Canvas',
  content TEXT NOT NULL DEFAULT '',
  canvas_data JSONB NOT NULL DEFAULT '{"nodes":[],"connectors":[],"mermaidCode":"","viewport":{"x":0,"y":0,"zoom":1}}'::JSONB,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canvas_documents ENABLE ROW LEVEL SECURITY;

-- Indexes for fast workspace and project filtering
CREATE INDEX IF NOT EXISTS idx_canvas_documents_workspace ON public.canvas_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_canvas_documents_project ON public.canvas_documents(project_id);

-- RLS Policies
CREATE POLICY "Allow workspace members to view canvas documents"
  ON public.canvas_documents FOR SELECT
  USING (
    auth.uid() IN (
      SELECT profile_id FROM public.workspace_members WHERE workspace_id = canvas_documents.workspace_id
    ) OR auth.uid() IN (
      SELECT created_by FROM public.workspaces WHERE id = canvas_documents.workspace_id
    )
  );

CREATE POLICY "Allow workspace members to insert canvas documents"
  ON public.canvas_documents FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT profile_id FROM public.workspace_members WHERE workspace_id = canvas_documents.workspace_id
    ) OR auth.uid() IN (
      SELECT created_by FROM public.workspaces WHERE id = canvas_documents.workspace_id
    )
  );

CREATE POLICY "Allow workspace members to update canvas documents"
  ON public.canvas_documents FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT profile_id FROM public.workspace_members WHERE workspace_id = canvas_documents.workspace_id
    ) OR auth.uid() IN (
      SELECT created_by FROM public.workspaces WHERE id = canvas_documents.workspace_id
    )
  );

CREATE POLICY "Allow workspace members to delete canvas documents"
  ON public.canvas_documents FOR DELETE
  USING (
    auth.uid() IN (
      SELECT profile_id FROM public.workspace_members WHERE workspace_id = canvas_documents.workspace_id
    ) OR auth.uid() IN (
      SELECT created_by FROM public.workspaces WHERE id = canvas_documents.workspace_id
    )
  );
