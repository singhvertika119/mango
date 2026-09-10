import { createClient } from "@/lib/supabase/server";
import { CanvasDocument, CanvasData } from "@/components/canvas/types";

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

export async function getCanvasDocuments(workspaceId: string, projectId: string): Promise<CanvasDocument[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("canvas_documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Supabase getCanvasDocuments error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      // Create initial starter document in Supabase
      const initial = await createCanvasDocument(workspaceId, projectId, "System Architecture & Specs", defaultNotesContent, defaultCanvasData);
      return initial ? [initial] : [];
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
  } catch (err: any) {
    console.error("Failed to getCanvasDocuments:", err?.message);
    return [];
  }
}

export async function getCanvasDocument(id: string): Promise<CanvasDocument | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("canvas_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
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
  } catch (err: any) {
    console.error("getCanvasDocument error:", err?.message);
    return null;
  }
}

export async function createCanvasDocument(
  workspaceId: string,
  projectId: string,
  title: string,
  content?: string,
  canvasData?: CanvasData
): Promise<CanvasDocument> {
  const newDocTitle = title || "Untitled Canvas";
  const newDocContent = content !== undefined ? content : defaultNotesContent;
  const newDocCanvasData = canvasData || defaultCanvasData;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("canvas_documents")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: newDocTitle,
        content: newDocContent,
        canvas_data: newDocCanvasData,
        created_by: user?.id || null
      })
      .select()
      .single();

    if (error || !data) {
      console.error("createCanvasDocument insert error:", error?.message);
      throw new Error(`Database error creating canvas document: ${error?.message}`);
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
  } catch (err: any) {
    console.error("createCanvasDocument error:", err?.message);
    throw err;
  }
}

export async function updateCanvasDocument(
  id: string,
  updates: Partial<Pick<CanvasDocument, "title" | "content" | "canvas_data">>
): Promise<CanvasDocument | null> {
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

    if (error || !data) {
      console.error("updateCanvasDocument error:", error?.message);
      return null;
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
  } catch (err: any) {
    console.error("updateCanvasDocument error:", err?.message);
    return null;
  }
}

export async function deleteCanvasDocument(id: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("canvas_documents")
      .delete()
      .eq("id", id);
    return !error;
  } catch (err: any) {
    console.error("deleteCanvasDocument error:", err?.message);
    return false;
  }
}
