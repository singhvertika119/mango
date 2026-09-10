import { createClient } from "@/lib/supabase/server";

export interface Note {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  content: string | null;
  created_by?: string;
  created_at: string;
}

export interface LinkItem {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  url: string;
  description: string | null;
  created_by?: string;
  created_at: string;
}

export interface CodeSnippet {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string | null;
  code: string;
  language: string;
  created_by?: string;
  created_at: string;
}

// ==========================================
// 1. Notes Service Functions
// ==========================================
export async function getNotes(workspaceId: string, projectId?: string): Promise<Note[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("notes").select("*").eq("workspace_id", workspaceId);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching notes:", error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("getNotes error:", err?.message);
    return [];
  }
}

export async function createNote(
  workspaceId: string,
  projectId: string,
  title: string,
  content: string | null
): Promise<Note | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("notes")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: title.trim(),
        content: content ? content.trim() : null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("createNote error:", err?.message);
    return null;
  }
}

export async function deleteNote(noteId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) {
      console.error("Error deleting note:", error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("deleteNote error:", err?.message);
    return false;
  }
}

// ==========================================
// 2. Links Service Functions
// ==========================================
export async function getLinks(workspaceId: string, projectId?: string): Promise<LinkItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("links").select("*").eq("workspace_id", workspaceId);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching links:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("getLinks error:", err?.message);
    return [];
  }
}

export async function createLink(
  workspaceId: string,
  projectId: string,
  title: string,
  url: string,
  description: string | null
): Promise<LinkItem | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("links")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: title.trim(),
        url: url.trim(),
        description: description ? description.trim() : null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating link:", error);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("createLink error:", err?.message);
    return null;
  }
}

export async function deleteLink(linkId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("links").delete().eq("id", linkId);
    if (error) {
      console.error("Error deleting link:", error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("deleteLink error:", err?.message);
    return false;
  }
}

// ==========================================
// 3. Code Snippets Service Functions
// ==========================================
export async function getCodeSnippets(workspaceId: string, projectId?: string): Promise<CodeSnippet[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("code_snippets").select("*").eq("workspace_id", workspaceId);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching code snippets:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("getCodeSnippets error:", err?.message);
    return [];
  }
}

export async function createCodeSnippet(
  workspaceId: string,
  projectId: string,
  title: string,
  description: string | null,
  code: string,
  language: string
): Promise<CodeSnippet | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("code_snippets")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: title.trim(),
        description: description ? description.trim() : null,
        code: code.trim(),
        language: language.trim() || "plaintext",
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating snippet:", error);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("createCodeSnippet error:", err?.message);
    return null;
  }
}

export async function deleteCodeSnippet(snippetId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("code_snippets").delete().eq("id", snippetId);
    if (error) {
      console.error("Error deleting snippet:", error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("deleteCodeSnippet error:", err?.message);
    return false;
  }
}
