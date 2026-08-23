"use server";

import { revalidatePath } from "next/cache";
import * as projectService from "@/lib/services/project";

export async function createProjectAction(
  workspaceId: string,
  name: string,
  description: string | null,
  startDate?: string,
  targetDate?: string
) {
  try {
    const proj = await projectService.createProject(workspaceId, name, description, startDate, targetDate);
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
