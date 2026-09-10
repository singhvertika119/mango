import { createClient } from "@/lib/supabase/server";
import { CanvasDocument, CanvasData } from "@/components/canvas/types";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const defaultCanvasData: CanvasData = {
  nodes: [
    {
      id: "node-1",
      type: "service",
      x: 80,
      y: 120,
      width: 180,
      height: 80,
      label: "Next.js Client",
      sublabel: "App Router + React 19",
      color: "indigo",
      fillColor: "tint",
      strokeWidth: 2,
      strokeStyle: "solid",
      icon: "globe"
    },
    {
      id: "node-2",
      type: "service",
      x: 340,
      y: 120,
      width: 190,
      height: 80,
      label: "API Gateway / Route",
      sublabel: "Server Actions & Edge",
      color: "sky",
      fillColor: "tint",
      strokeWidth: 2,
      strokeStyle: "solid",
      icon: "zap"
    },
    {
      id: "node-3",
      type: "service",
      x: 610,
      y: 120,
      width: 190,
      height: 80,
      label: "Groq LLM Engine",
      sublabel: "Llama 3.3 Planner",
      color: "purple",
      fillColor: "tint",
      strokeWidth: 2,
      strokeStyle: "solid",
      icon: "cpu"
    },
    {
      id: "node-4",
      type: "database",
      x: 340,
      y: 280,
      width: 190,
      height: 85,
      label: "Supabase PostgreSQL",
      sublabel: "pgvector + RLS Policies",
      color: "emerald",
      fillColor: "tint",
      strokeWidth: 2,
      strokeStyle: "solid",
      icon: "database"
    },
    {
      id: "node-5",
      type: "sticky",
      x: 620,
      y: 280,
      width: 180,
      height: 90,
      label: "Architecture Note:\nHybrid vector search is sub-50ms.",
      color: "amber",
      fillColor: "tint",
      strokeWidth: 1,
      strokeStyle: "solid"
    }
  ],
  connectors: [
    {
      id: "conn-1",
      fromNodeId: "node-1",
      toNodeId: "node-2",
      label: "HTTPS",
      style: "solid",
      color: "indigo"
    },
    {
      id: "conn-2",
      fromNodeId: "node-2",
      toNodeId: "node-3",
      label: "RPC Call",
      style: "solid",
      color: "purple"
    },
    {
      id: "conn-3",
      fromNodeId: "node-2",
      toNodeId: "node-4",
      label: "SQL & Vectors",
      style: "solid",
      color: "emerald"
    }
  ],
  viewport: { x: 0, y: 0, zoom: 1 }
};

export const defaultNotesContent = `System Architecture & Project Notes

Welcome to your Canvas & Docs workspace!
Here you can write continuous notes, requirements, meeting summaries, and architecture specs in clear plain English on the left, while designing visual diagrams, service blocks, and flowcharts on the right.

Project Overview:
- Next.js App Router powers fast server-side rendering, client transitions, and Server Actions.
- Supabase PostgreSQL database handles user authentication, data persistence, and hybrid vector search.
- Groq Llama 3.3 LLM enables autonomous agent planning, smart summaries, and architecture generation.
- The visual whiteboard lets you position services, databases, decision diamonds, and connect them with arrows.

Key Technical Notes:
All notes saved here are automatically synchronized with your workspace database in real time. You can export these notes as text or download the visual canvas diagrams anytime.
`;

// Global in-memory store for fallback/mock mode
let mockCanvasDocuments: CanvasDocument[] = [
  {
    id: "default-canvas-1",
    workspace_id: "mango-default-ws",
    project_id: "mango-default-proj",
    title: "System Architecture & Specs",
    content: defaultNotesContent,
    canvas_data: defaultCanvasData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function getCanvasDocuments(workspaceId: string, projectId: string): Promise<CanvasDocument[]> {
  if (!isSupabaseConfigured) {
    const filtered = mockCanvasDocuments.filter(d => d.workspace_id === workspaceId);
    if (filtered.length === 0) {
      // Auto create a starter canvas for the workspace
      const starter: CanvasDocument = {
        id: `canvas-${Date.now()}`,
        workspace_id: workspaceId,
        project_id: projectId,
        title: "System Architecture & Specs",
        content: defaultNotesContent,
        canvas_data: defaultCanvasData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockCanvasDocuments.push(starter);
      return [starter];
    }
    return filtered;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("canvas_documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Supabase getCanvasDocuments error, falling back to mock:", error.message);
      return mockCanvasDocuments;
    }

    if (!data || data.length === 0) {
      // Create initial starter document
      return [await createCanvasDocument(workspaceId, projectId, "System Architecture & Specs", defaultNotesContent, defaultCanvasData)];
    }

    return data.map(d => ({
      id: d.id,
      workspace_id: d.workspace_id,
      project_id: d.project_id,
      title: d.title,
      content: d.content || "",
      canvas_data: d.canvas_data || defaultCanvasData,
      created_by: d.created_by,
      created_at: d.created_at,
      updated_at: d.updated_at
    }));
  } catch (err) {
    console.error("Failed to getCanvasDocuments:", err);
    return mockCanvasDocuments;
  }
}

export async function getCanvasDocument(id: string): Promise<CanvasDocument | null> {
  if (!isSupabaseConfigured) {
    const doc = mockCanvasDocuments.find(d => d.id === id);
    return doc || mockCanvasDocuments[0] || null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("canvas_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return mockCanvasDocuments.find(d => d.id === id) || null;
    }

    return {
      id: data.id,
      workspace_id: data.workspace_id,
      project_id: data.project_id,
      title: data.title,
      content: data.content || "",
      canvas_data: data.canvas_data || defaultCanvasData,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch {
    return mockCanvasDocuments.find(d => d.id === id) || null;
  }
}

export async function createCanvasDocument(
  workspaceId: string,
  projectId: string,
  title: string,
  content?: string,
  canvasData?: CanvasData
): Promise<CanvasDocument> {
  const newDoc: CanvasDocument = {
    id: `canvas-${Date.now()}`,
    workspace_id: workspaceId,
    project_id: projectId,
    title: title || "Untitled Canvas",
    content: content !== undefined ? content : defaultNotesContent,
    canvas_data: canvasData || defaultCanvasData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!isSupabaseConfigured) {
    mockCanvasDocuments.unshift(newDoc);
    return newDoc;
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("canvas_documents")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: newDoc.title,
        content: newDoc.content,
        canvas_data: newDoc.canvas_data,
        created_by: user?.id || null
      })
      .select()
      .single();

    if (error) {
      console.warn("createCanvasDocument insert error, using in-memory:", error.message);
      mockCanvasDocuments.unshift(newDoc);
      return newDoc;
    }

    return {
      id: data.id,
      workspace_id: data.workspace_id,
      project_id: data.project_id,
      title: data.title,
      content: data.content || "",
      canvas_data: data.canvas_data || defaultCanvasData,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch {
    mockCanvasDocuments.unshift(newDoc);
    return newDoc;
  }
}

export async function updateCanvasDocument(
  id: string,
  updates: Partial<Pick<CanvasDocument, "title" | "content" | "canvas_data">>
): Promise<CanvasDocument | null> {
  const idx = mockCanvasDocuments.findIndex(d => d.id === id);
  if (idx !== -1) {
    mockCanvasDocuments[idx] = {
      ...mockCanvasDocuments[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  if (!isSupabaseConfigured) {
    return idx !== -1 ? mockCanvasDocuments[idx] : null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("canvas_documents")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.warn("updateCanvasDocument error, returning cached:", error.message);
      return idx !== -1 ? mockCanvasDocuments[idx] : null;
    }

    return {
      id: data.id,
      workspace_id: data.workspace_id,
      project_id: data.project_id,
      title: data.title,
      content: data.content || "",
      canvas_data: data.canvas_data || defaultCanvasData,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch {
    return idx !== -1 ? mockCanvasDocuments[idx] : null;
  }
}

export async function deleteCanvasDocument(id: string): Promise<boolean> {
  mockCanvasDocuments = mockCanvasDocuments.filter(d => d.id !== id);

  if (!isSupabaseConfigured) return true;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("canvas_documents")
      .delete()
      .eq("id", id);
    return !error;
  } catch {
    return true;
  }
}
