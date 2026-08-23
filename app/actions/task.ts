"use server";

import { revalidatePath } from "next/cache";
import * as taskService from "@/lib/services/task";

export async function getTasksAction(workspaceId: string, projectId?: string) {
  try {
    const list = await taskService.getTasks(workspaceId, projectId);
    return { success: true, tasks: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch tasks." };
  }
}

export async function createTaskAction(
  workspaceId: string,
  projectId: string,
  title: string,
  description: string | null,
  status: "Todo" | "In Progress" | "Review" | "Completed" | "Blocked",
  priority: "low" | "medium" | "high" | "urgent",
  assigneeId?: string | null,
  dueDate?: string | null
) {
  try {
    const task = await taskService.createTask(
      workspaceId,
      projectId,
      title,
      description,
      status,
      priority,
      assigneeId || null,
      dueDate || null
    );
    if (task) {
      revalidatePath("/tasks");
      return { success: true, task };
    }
    return { success: false, error: "Failed to create task." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function updateTaskAction(
  taskId: string,
  updates: any
) {
  try {
    const task = await taskService.updateTask(taskId, updates);
    if (task) {
      revalidatePath("/tasks");
      return { success: true, task };
    }
    return { success: false, error: "Failed to update task." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const success = await taskService.deleteTask(taskId);
    if (success) {
      revalidatePath("/tasks");
      return { success: true };
    }
    return { success: false, error: "Failed to delete task." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}
