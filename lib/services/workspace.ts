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

export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Query workspaces where user is creator or member
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching workspaces:", error.message);
      return [];
    }

    // If new user has 0 workspaces, auto-provision their initial default workspace
    if (!data || data.length === 0) {
      const defaultWs = await createWorkspace("My Workspace");
      if (defaultWs) {
        return [defaultWs];
      }
      return [];
    }

    return data;
  } catch (err: any) {
    console.error("Failed to get workspaces:", err?.message);
    return [];
  }
}

export async function createWorkspace(name: string): Promise<Workspace | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be logged in to create a workspace");
    }

    // 1. Ensure user profile exists
    const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Developer";
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email || "",
        full_name: fullName,
        avatar_url: user.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 2. Insert workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (wsError || !workspace) {
      console.error("Error creating workspace in Supabase:", wsError?.message);
      return null;
    }

    // 3. Add creator as OWNER in workspace_members
    await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      profile_id: user.id,
      role: "OWNER",
    });

    // 4. Provision initial starter project for this workspace
    await supabase.from("projects").insert({
      workspace_id: workspace.id,
      name: `${name.trim()} Project`,
      description: `Primary project stream for ${name.trim()}.`,
      created_by: user.id,
      status: "active",
    });

    return workspace;
  } catch (err: any) {
    console.error("createWorkspace failed:", err?.message);
    return null;
  }
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
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
      console.error("Error fetching workspace members:", error.message);
      return [];
    }
    return (data as any) || [];
  } catch (err: any) {
    console.error("getWorkspaceMembers error:", err?.message);
    return [];
  }
}

export async function updateWorkspace(workspaceId: string, name: string): Promise<Workspace | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workspaces")
      .update({ name: name.trim() })
      .eq("id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating workspace:", error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("updateWorkspace error:", err?.message);
    return null;
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);

    if (error) {
      console.error("Error deleting workspace:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("deleteWorkspace error:", err?.message);
    return false;
  }
}
