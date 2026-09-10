import { createClient } from "@/lib/supabase/server";

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: string;
  github_repo?: string | null;
  start_date: string | null;
  target_date: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Global mock memory to allow project creation & listing without database
let mockProjects: Project[] = [
  {
    id: "mango-default-proj",
    workspace_id: "mango-default-ws",
    name: "Workspace Agent MVP",
    description: "Build Next.js + Supabase foundation, auth, layouts, and mock workspaces.",
    status: "active",
    github_repo: "singhvertika119/mango",
    start_date: new Date().toISOString(),
    target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function getProjects(workspaceId: string): Promise<Project[]> {
  if (!isSupabaseConfigured) {
    return mockProjects.filter((p) => p.workspace_id === workspaceId);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Error fetching projects, using fallback:", error.message);
      return mockProjects.filter((p) => p.workspace_id === workspaceId);
    }
    return data || [];
  } catch (err) {
    console.warn("Supabase timeout/error in getProjects, using fallback:", err);
    return mockProjects.filter((p) => p.workspace_id === workspaceId);
  }
}

export async function getWorkspaceProject(workspaceId: string): Promise<Project | null> {
  const fallback = mockProjects.find((p) => p.workspace_id === workspaceId) || mockProjects[0] || null;

  if (!isSupabaseConfigured) {
    return fallback;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }
    return data;
  } catch (err) {
    console.warn("Supabase timeout/error in getWorkspaceProject, using fallback:", err);
    return fallback;
  }
}

export async function getOrCreateWorkspaceProject(workspaceId: string, defaultName?: string): Promise<Project | null> {
  try {
    const existing = await getWorkspaceProject(workspaceId);
    if (existing) return existing;

    // Otherwise, lookup workspace name or use defaultName
    let projName = defaultName || "Primary Project";
    if (isSupabaseConfigured) {
      try {
        const supabase = await createClient();
        const { data: ws } = await supabase.from("workspaces").select("name").eq("id", workspaceId).single();
        if (ws?.name) projName = `${ws.name} Project`;
      } catch {}
    }

    return await createProject(
      workspaceId,
      projName,
      "Workspace primary development project stream."
    );
  } catch (err) {
    console.warn("Error in getOrCreateWorkspaceProject, using fallback:", err);
    return mockProjects[0];
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  if (!isSupabaseConfigured) {
    return mockProjects.find((p) => p.id === projectId) || null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !data) {
      return mockProjects.find((p) => p.id === projectId) || mockProjects[0] || null;
    }
    return data;
  } catch (err) {
    console.warn("Supabase timeout in getProject, using fallback:", err);
    return mockProjects.find((p) => p.id === projectId) || mockProjects[0] || null;
  }
}

export async function createProject(
  workspaceId: string,
  name: string,
  description: string | null,
  startDate?: string,
  targetDate?: string,
  githubRepo?: string | null
): Promise<Project | null> {
  const fallbackProj: Project = {
    id: `mock-proj-${Date.now()}`,
    workspace_id: workspaceId,
    name,
    description,
    status: "active",
    github_repo: githubRepo || null,
    start_date: startDate || new Date().toISOString(),
    target_date: targetDate || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!isSupabaseConfigured) {
    mockProjects.push(fallbackProj);
    return fallbackProj;
  }

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      mockProjects.push(fallbackProj);
      return fallbackProj;
    }

    // Ensure profile exists in public.profiles table
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
      console.warn("Profile upsert notice in createProject:", err);
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        github_repo: githubRepo || null,
        start_date: startDate || null,
        target_date: targetDate || null,
        created_by: user.id,
        status: "active"
      })
      .select()
      .single();

    if (error || !data) {
      console.warn("Error creating project in Supabase, using mock fallback:", error?.message);
      mockProjects.push(fallbackProj);
      return fallbackProj;
    }
    return data;
  } catch (err) {
    console.warn("Supabase timeout in createProject, using mock fallback:", err);
    mockProjects.push(fallbackProj);
    return fallbackProj;
  }
}

export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, "id" | "workspace_id" | "created_at" | "updated_at">>
): Promise<Project | null> {
  if (!isSupabaseConfigured) {
    const index = mockProjects.findIndex((p) => p.id === projectId);
    if (index !== -1) {
      mockProjects[index] = {
        ...mockProjects[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      return mockProjects[index];
    }
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    console.error("Error updating project:", error);
    return null;
  }
  return data;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const index = mockProjects.findIndex((p) => p.id === projectId);
    if (index !== -1) {
      mockProjects.splice(index, 1);
      return true;
    }
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("Error deleting project:", error);
    return false;
  }
  return true;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  role: "EDITOR" | "VIEWER";
  created_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

let mockProjectMembers: ProjectMember[] = [];

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  if (!isSupabaseConfigured) {
    return mockProjectMembers.filter(m => m.project_id === projectId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("*, profile:profiles!project_members_profile_id_fkey(id, email, full_name, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching project members:", error);
    return [];
  }
  return data || [];
}

export async function addProjectMember(
  projectId: string,
  email: string,
  role: "EDITOR" | "VIEWER" = "EDITOR"
): Promise<{ success: boolean; error?: string; member?: ProjectMember }> {
  if (!isSupabaseConfigured) {
    const newMember: ProjectMember = {
      id: `mock-pm-${Date.now()}`,
      project_id: projectId,
      profile_id: `mock-prof-${Date.now()}`,
      role,
      created_at: new Date().toISOString(),
      profile: {
        id: `mock-prof-${Date.now()}`,
        email,
        full_name: email.split("@")[0],
        avatar_url: null
      }
    };
    mockProjectMembers.push(newMember);
    return { success: true, member: newMember };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Find profile by email
  const { data: targetProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .ilike("email", email.trim())
    .maybeSingle();

  if (profileErr || !targetProfile) {
    return {
      success: false,
      error: `No user found with email "${email}". Please ensure your teammate has registered on Mango first.`
    };
  }

  // Insert into project_members
  const { data: member, error: insertErr } = await supabase
    .from("project_members")
    .insert({
      project_id: projectId,
      profile_id: targetProfile.id,
      role,
      invited_by: user.id
    })
    .select("*, profile:profiles(id, email, full_name, avatar_url)")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { success: false, error: "This user is already a member of this project." };
    }
    return { success: false, error: insertErr.message || "Failed to add member to project." };
  }

  return { success: true, member };
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const idx = mockProjectMembers.findIndex(m => m.id === memberId);
    if (idx !== -1) {
      mockProjectMembers.splice(idx, 1);
      return true;
    }
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId)
    .eq("project_id", projectId);

  if (error) {
    console.error("Error removing project member:", error);
    return false;
  }
  return true;
}
