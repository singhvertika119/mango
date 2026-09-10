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

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return mockWorkspaces;

    // 1. Ensure user profile exists in public.profiles table (fallback if auth trigger did not fire)
    try {
      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Developer";
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || "",
          full_name: fullName,
          avatar_url: user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("Profile upsert notice in getWorkspaces:", err);
    }

    // 2. Query workspaces where user is creator or member
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Error fetching workspaces, using fallback:", error.message);
      return mockWorkspaces;
    }

    // 3. If new user has 0 workspaces, auto-provision a default workspace + default project!
    if (!data || data.length === 0) {
      console.log("No workspaces found for user. Auto-provisioning default workspace...");
      try {
        const defaultWs = await createWorkspace("Mango Workspace");
        if (defaultWs) {
          return [defaultWs];
        }
      } catch (err) {
        console.warn("Auto create workspace notice:", err);
      }
      return mockWorkspaces;
    }

    return data;
  } catch (err) {
    console.warn("Supabase timeout/error in getWorkspaces, returning fallback:", err);
    return mockWorkspaces;
  }
}

export async function createWorkspace(name: string): Promise<Workspace | null> {
  const fallbackWs: Workspace = {
    id: `mock-ws-${Date.now()}`,
    name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!isSupabaseConfigured) {
    mockWorkspaces.push(fallbackWs);
    return fallbackWs;
  }

  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      mockWorkspaces.push(fallbackWs);
      return fallbackWs;
    }

    // 1. Ensure user profile exists before inserting workspace to satisfy foreign key constraint!
    try {
      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Developer";
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || "",
          full_name: fullName,
          avatar_url: user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("Profile upsert notice in createWorkspace:", err);
    }

    // 2. Insert workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (wsError || !workspace) {
      console.warn("Error creating workspace in Supabase, using local store:", wsError?.message);
      mockWorkspaces.push(fallbackWs);
      return fallbackWs;
    }

    // 3. Add creator as OWNER member
    try {
      await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          profile_id: user.id,
          role: "OWNER"
        });
    } catch (mErr) {
      console.warn("Workspace member insert notice:", mErr);
    }

    // 4. Provision a starter project for this workspace so tasks, canvas, documents are immediately usable
    try {
      const { data: existingProject } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", workspace.id)
        .limit(1)
        .maybeSingle();

      if (!existingProject) {
        await supabase.from("projects").insert({
          workspace_id: workspace.id,
          name: `${name} Project`,
          description: `Primary development project stream for ${name}.`,
          created_by: user.id,
          status: "active"
        });
      }
    } catch (projErr) {
      console.warn("Could not create initial project for workspace:", projErr);
    }

    return workspace;
  } catch (err) {
    console.warn("Supabase timeout in createWorkspace, using local fallback:", err);
    mockWorkspaces.push(fallbackWs);
    return fallbackWs;
  }
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

