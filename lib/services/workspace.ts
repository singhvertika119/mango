import { createClient } from "@/lib/supabase/server";

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  profile_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Global mock memory to allow dynamic switching/adding during mockup demo
let mockWorkspaces: Workspace[] = [
  {
    id: "mango-default-ws",
    name: "Mango Workspace",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function getWorkspaces(): Promise<Workspace[]> {
  if (!isSupabaseConfigured) {
    return mockWorkspaces;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching workspaces:", error);
    return [];
  }
  return data || [];
}

export async function createWorkspace(name: string): Promise<Workspace | null> {
  if (!isSupabaseConfigured) {
    const ws: Workspace = {
      id: `mock-ws-${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockWorkspaces.push(ws);
    return ws;
  }

  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Insert workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (wsError) {
    console.error("Error creating workspace:", wsError);
    return null;
  }

  // Also add creator as OWNER member
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      profile_id: user.id,
      role: "OWNER"
    });

  if (memberError) {
    console.error("Error creating workspace owner member:", memberError);
  }

  return workspace;
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  if (!isSupabaseConfigured) {
    return [
      {
        id: "mock-member-1",
        workspace_id: workspaceId,
        profile_id: "mock-user-id",
        role: "OWNER",
        created_at: new Date().toISOString(),
        profiles: {
          email: "developer@mango.dev",
          full_name: "Mock Developer",
          avatar_url: null
        }
      }
    ];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      id,
      workspace_id,
      profile_id,
      role,
      created_at,
      profiles:profiles (
        email,
        full_name,
        avatar_url
      )
    `)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Error fetching workspace members:", error);
    return [];
  }
  return (data as any) || [];
}

export async function updateWorkspace(workspaceId: string, name: string): Promise<Workspace | null> {
  if (!isSupabaseConfigured) {
    const idx = mockWorkspaces.findIndex(w => w.id === workspaceId);
    if (idx !== -1) {
      mockWorkspaces[idx].name = name;
      mockWorkspaces[idx].updated_at = new Date().toISOString();
      return mockWorkspaces[idx];
    }
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", workspaceId)
    .select()
    .single();

  if (error) {
    console.error("Error updating workspace:", error);
    return null;
  }
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const idx = mockWorkspaces.findIndex(w => w.id === workspaceId);
    if (idx !== -1) {
      mockWorkspaces.splice(idx, 1);
      return true;
    }
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) {
    console.error("Error deleting workspace:", error);
    return false;
  }
  return true;
}

