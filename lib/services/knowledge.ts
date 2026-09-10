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

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Global mock memory for knowledge assets
let mockNotes: Note[] = [
  {
    id: "mock-note-1",
    workspace_id: "mango-default-ws",
    project_id: "mango-default-proj",
    title: "Database Encryption Guidelines",
    content: "Integrations must encrypt `credentials` columns using `AES-256-GCM` with the hex `ENCRYPTION_KEY` env secret key.",
    created_at: new Date().toISOString()
  }
];

let mockLinks: LinkItem[] = [
  {
    id: "mock-link-1",
    workspace_id: "mango-default-ws",
    project_id: "mango-default-proj",
    title: "Next.js 16 Router Documentation",
    url: "https://nextjs.org/docs",
    description: "API references for Turbopack routing, layouts, and server actions.",
    created_at: new Date().toISOString()
  }
];

let mockSnippets: CodeSnippet[] = [
  {
    id: "mock-snippet-1",
    workspace_id: "mango-default-ws",
    project_id: "mango-default-proj",
    title: "Next.js 16 Proxy Setup",
    description: "Sample proxy.ts file convention replacing middleware.ts.",
    code: `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image).*)",
};`,
    language: "typescript",
    created_at: new Date().toISOString()
  }
];

// ==========================================
// 1. Notes Service Functions
// ==========================================
export async function getNotes(workspaceId: string, projectId?: string): Promise<Note[]> {
  const getFallback = () => {
    let list = mockNotes.filter((n) => n.workspace_id === workspaceId);
    if (projectId) list = list.filter((n) => n.project_id === projectId);
    return list.length > 0 ? list : mockNotes;
  };

  if (!isSupabaseConfigured) {
    return getFallback();
  }

  try {
    const supabase = await createClient();
    let query = supabase.from("notes").select("*").eq("workspace_id", workspaceId);
    if (projectId) query = query.eq("project_id", projectId);
    
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.warn("Error fetching notes, using fallback:", error.message);
      return getFallback();
    }
    return data || [];
  } catch (err) {
    console.warn("Supabase timeout in getNotes, using fallback:", err);
    return getFallback();
  }
}

export async function createNote(
  workspaceId: string,
  projectId: string,
  title: string,
  content: string | null
): Promise<Note | null> {
  if (!isSupabaseConfigured) {
    const note: Note = {
      id: `mock-note-${Date.now()}`,
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      content,
      created_at: new Date().toISOString()
    };
    mockNotes.push(note);
    return note;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      content,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating note:", error);
    return null;
  }
  return data;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const index = mockNotes.findIndex((n) => n.id === noteId);
    if (index !== -1) {
      mockNotes.splice(index, 1);
      return true;
    }
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) {
    console.error("Error deleting note:", error);
    return false;
  }
  return true;
}

// ==========================================
// 2. Links Service Functions
// ==========================================
export async function getLinks(workspaceId: string, projectId?: string): Promise<LinkItem[]> {
  if (!isSupabaseConfigured) {
    let list = mockLinks.filter((l) => l.workspace_id === workspaceId);
    if (projectId) list = list.filter((l) => l.project_id === projectId);
    return list;
  }

  const supabase = await createClient();
  let query = supabase.from("links").select("*").eq("workspace_id", workspaceId);
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching links:", error);
    return [];
  }
  return data || [];
}

export async function createLink(
  workspaceId: string,
  projectId: string,
  title: string,
  url: string,
  description: string | null
): Promise<LinkItem | null> {
  if (!isSupabaseConfigured) {
    const item: LinkItem = {
      id: `mock-link-${Date.now()}`,
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      url,
      description,
      created_at: new Date().toISOString()
    };
    mockLinks.push(item);
    return item;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("links")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      url,
      description,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating link:", error);
    return null;
  }
  return data;
}

export async function deleteLink(linkId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const index = mockLinks.findIndex((l) => l.id === linkId);
    if (index !== -1) {
      mockLinks.splice(index, 1);
      return true;
    }
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("links").delete().eq("id", linkId);
  if (error) {
    console.error("Error deleting link:", error);
    return false;
  }
  return true;
}

// ==========================================
// 3. Code Snippets Service Functions
// ==========================================
export async function getCodeSnippets(workspaceId: string, projectId?: string): Promise<CodeSnippet[]> {
  if (!isSupabaseConfigured) {
    let list = mockSnippets.filter((s) => s.workspace_id === workspaceId);
    if (projectId) list = list.filter((s) => s.project_id === projectId);
    return list;
  }

  const supabase = await createClient();
  let query = supabase.from("code_snippets").select("*").eq("workspace_id", workspaceId);
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching code snippets:", error);
    return [];
  }
  return data || [];
}

export async function createCodeSnippet(
  workspaceId: string,
  projectId: string,
  title: string,
  description: string | null,
  code: string,
  language: string
): Promise<CodeSnippet | null> {
  if (!isSupabaseConfigured) {
    const snippet: CodeSnippet = {
      id: `mock-snippet-${Date.now()}`,
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      description,
      code,
      language,
      created_at: new Date().toISOString()
    };
    mockSnippets.push(snippet);
    return snippet;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("code_snippets")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      description,
      code,
      language,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating snippet:", error);
    return null;
  }
  return data;
}

export async function deleteCodeSnippet(snippetId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const index = mockSnippets.findIndex((s) => s.id === snippetId);
    if (index !== -1) {
      mockSnippets.splice(index, 1);
      return true;
    }
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("code_snippets").delete().eq("id", snippetId);
  if (error) {
    console.error("Error deleting snippet:", error);
    return false;
  }
  return true;
}
