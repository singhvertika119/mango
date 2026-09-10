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

export interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  role: string;
  created_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export async function getProjects(workspaceId: string): Promise<Project[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("getProjects error:", err?.message);
    return [];
  }
}

export async function getWorkspaceProject(workspaceId: string): Promise<Project | null> {
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
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("getWorkspaceProject error:", err?.message);
    return null;
  }
}

export async function getOrCreateWorkspaceProject(workspaceId: string, defaultName?: string): Promise<Project | null> {
  try {
    const existing = await getWorkspaceProject(workspaceId);
    if (existing) return existing;

    const supabase = await createClient();
    const { data: ws } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
    const projName = defaultName || (ws?.name ? `${ws.name} Project` : "Primary Project");

    return await createProject(
      workspaceId,
      projName,
      "Workspace primary development project stream."
    );
  } catch (err: any) {
    console.error("getOrCreateWorkspaceProject error:", err?.message);
    return null;
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !data) {
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("getProject error:", err?.message);
    return null;
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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        description: description ? description.trim() : null,
        github_repo: githubRepo || null,
        start_date: startDate || null,
        target_date: targetDate || null,
        created_by: user?.id || null,
        status: "active",
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating project in Supabase:", error?.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("createProject error:", err?.message);
    return null;
  }
}

export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, "id" | "workspace_id" | "created_at" | "updated_at">>
): Promise<Project | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      console.error("Error updating project:", error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error("updateProject error:", err?.message);
    return null;
  }
}

export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("Error deleting project:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("deleteProject error:", err?.message);
    return false;
  }
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_members")
      .select("*, profile:profiles(id, email, full_name, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching project members:", error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("getProjectMembers error:", err?.message);
    return [];
  }
}

export async function addProjectMember(
  projectId: string,
  email: string,
  role: string = "member"
): Promise<{ success: boolean; error?: string; member?: ProjectMember }> {
  try {
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
        error: `No user found with email "${email}". Please ensure your teammate has registered on Mango first.`,
      };
    }

    const { data: member, error: insertErr } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        profile_id: targetProfile.id,
        role,
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
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to add project member." };
  }
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId)
      .eq("project_id", projectId);

    if (error) {
      console.error("Error removing project member:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("removeProjectMember error:", err?.message);
    return false;
  }
}
