"use server";

import { revalidatePath } from "next/cache";
import * as workspaceService from "@/lib/services/workspace";

export async function createWorkspaceAction(name: string) {
  try {
    const ws = await workspaceService.createWorkspace(name);
    if (ws) {
      revalidatePath("/dashboard");
      return { success: true, workspace: ws };
    }
    return { success: false, error: "Failed to create workspace." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function getWorkspacesAction() {
  try {
    const list = await workspaceService.getWorkspaces();
    return { success: true, workspaces: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch workspaces." };
  }
}

export async function getWorkspaceMembersAction(workspaceId: string) {
  try {
    const members = await workspaceService.getWorkspaceMembers(workspaceId);
    return { success: true, members };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch members." };
  }
}

export async function updateWorkspaceNameAction(workspaceId: string, name: string) {
  try {
    const ws = await workspaceService.updateWorkspace(workspaceId, name);
    if (ws) {
      revalidatePath("/settings");
      revalidatePath("/dashboard");
      return { success: true, workspace: ws };
    }
    return { success: false, error: "Failed to update workspace name." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update workspace." };
  }
}

export async function deleteWorkspaceAction(workspaceId: string) {
  try {
    const ok = await workspaceService.deleteWorkspace(workspaceId);
    if (ok) {
      revalidatePath("/dashboard");
      return { success: true };
    }
    return { success: false, error: "Failed to delete workspace." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete workspace." };
  }
}

