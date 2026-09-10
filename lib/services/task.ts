import { createClient } from "@/lib/supabase/server";

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "Todo" | "In Progress" | "Review" | "Completed" | "Blocked";
  priority: "low" | "medium" | "high" | "urgent";
  assignee_id: string | null;
  due_date: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export function normalizeTaskStatus(status?: string | null): Task["status"] {
  if (!status) return "Todo";
  const s = status.trim().toLowerCase().replace(/[-_]/g, " ");
  if (
    s === "todo" ||
    s === "to do" ||
    s === "open" ||
    s === "new" ||
    s === "backlog" ||
    s === "pending" ||
    s === "planned"
  ) {
    return "Todo";
  }
  if (
    s === "in progress" ||
    s === "inprogress" ||
    s === "doing" ||
    s === "active" ||
    s === "working" ||
    s === "wip" ||
    s === "started"
  ) {
    return "In Progress";
  }
  if (
    s === "review" ||
    s === "in review" ||
    s === "inreview" ||
    s === "pr" ||
    s === "qa" ||
    s === "testing"
  ) {
    return "Review";
  }
  if (
    s === "completed" ||
    s === "complete" ||
    s === "done" ||
    s === "finished" ||
    s === "resolved" ||
    s === "closed"
  ) {
    return "Completed";
  }
  if (
    s === "blocked" ||
    s === "hold" ||
    s === "on hold" ||
    s === "stuck" ||
    s === "waiting"
  ) {
    return "Blocked";
  }
  return "Todo";
}

export function normalizeTaskPriority(priority?: string | null): Task["priority"] {
  if (!priority) return "medium";
  const p = priority.trim().toLowerCase();
  if (p === "low" || p === "minor" || p === "p3") return "low";
  if (p === "high" || p === "p1" || p === "important") return "high";
  if (
    p === "urgent" ||
    p === "critical" ||
    p === "p0" ||
    p === "emergency" ||
    p === "blocker"
  ) {
    return "urgent";
  }
  return "medium";
}

export async function getTasks(workspaceId: string, projectId?: string): Promise<Task[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error.message);
      return [];
    }
    return (data as Task[]) || [];
  } catch (err: any) {
    console.error("getTasks error:", err?.message);
    return [];
  }
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  title: string,
  description: string | null = null,
  status: any = "Todo",
  priority: any = "medium",
  assigneeId: string | null = null,
  dueDate: string | null = null
): Promise<Task | null> {
  const normalizedStatus = normalizeTaskStatus(status);
  const normalizedPriority = normalizeTaskPriority(priority);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: title.trim(),
        description: description ? description.trim() : null,
        status: normalizedStatus,
        priority: normalizedPriority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating task in Supabase:", error);
      throw new Error(`Database error creating task: ${error.message}`);
    }
    return data as Task;
  } catch (err: any) {
    console.error("createTask error:", err?.message);
    throw err;
  }
}

export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, "id" | "workspace_id" | "project_id" | "created_at" | "updated_at">> & {
    status?: any;
    priority?: any;
  }
): Promise<Task | null> {
  const cleanUpdates = { ...updates };
  if (cleanUpdates.status !== undefined) {
    cleanUpdates.status = normalizeTaskStatus(cleanUpdates.status);
  }
  if (cleanUpdates.priority !== undefined) {
    cleanUpdates.priority = normalizeTaskPriority(cleanUpdates.priority);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update(cleanUpdates)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating task in Supabase:", error);
      throw new Error(`Database error updating task: ${error.message}`);
    }
    return data as Task;
  } catch (err: any) {
    console.error("updateTask error:", err?.message);
    throw err;
  }
}

export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error("Error deleting task:", error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("deleteTask error:", err?.message);
    return false;
  }
}
