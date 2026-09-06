"use server";

import { revalidatePath } from "next/cache";
import * as projectService from "@/lib/services/project";
export type { Project } from "@/lib/services/project";

export async function createProjectAction(
  workspaceId: string,
  name: string,
  description: string | null,
  startDate?: string,
  targetDate?: string,
  githubRepo?: string | null
) {
  try {
    const proj = await projectService.createProject(workspaceId, name, description, startDate, targetDate, githubRepo);
    if (proj) {
      revalidatePath("/projects");
      return { success: true, project: proj };
    }
    return { success: false, error: "Failed to create project." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function getProjectsAction(workspaceId: string) {
  try {
    const list = await projectService.getProjects(workspaceId);
    return { success: true, projects: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch projects." };
  }
}

export async function getWorkspaceProjectAction(workspaceId: string) {
  try {
    const project = await projectService.getOrCreateWorkspaceProject(workspaceId);
    return { success: true, project };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load workspace project." };
  }
}

export async function updateProjectAction(projectId: string, updates: any) {
  try {
    const proj = await projectService.updateProject(projectId, updates);
    if (proj) {
      revalidatePath("/projects");
      return { success: true, project: proj };
    }
    return { success: false, error: "Failed to update project." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const success = await projectService.deleteProject(projectId);
    if (success) {
      revalidatePath("/projects");
      return { success: true };
    }
    return { success: false, error: "Failed to delete project." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function getProjectMembersAction(projectId: string) {
  try {
    const members = await projectService.getProjectMembers(projectId);
    return { success: true, members };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch project members." };
  }
}

export async function inviteProjectMemberAction(
  projectId: string,
  email: string,
  role: "EDITOR" | "VIEWER" = "EDITOR"
): Promise<{ success: boolean; error?: string; member?: projectService.ProjectMember }> {
  try {
    const res = await projectService.addProjectMember(projectId, email, role);
    if (res.success) {
      revalidatePath("/projects");
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to invite project member." };
  }
}

export async function removeProjectMemberAction(projectId: string, memberId: string) {
  try {
    const success = await projectService.removeProjectMember(projectId, memberId);
    if (success) {
      revalidatePath("/projects");
      return { success: true };
    }
    return { success: false, error: "Failed to remove project member." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove member." };
  }
}
