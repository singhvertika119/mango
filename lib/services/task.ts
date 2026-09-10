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

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Global mock memory for tasks
let mockTasks: Task[] = [
  {
    id: "mock-task-1",
    workspace_id: "mango-default-ws",
    project_id: "mango-default-proj",
    title: "Configure Database Migrations",
    description: "Write initial schemas and configure RLS policies on tables.",
    status: "Completed",
    priority: "high",
    assignee_id: "mock-user-id",
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mock-task-2",
    workspace_id: "mango-default-ws",
    project_id: "mango-default-proj",
    title: "Implement Task Management Boards",
    description: "Build Kanban cards and update status dynamically on dragging.",
    status: "In Progress",
    priority: "medium",
    assignee_id: "mock-user-id",
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function getTasks(workspaceId: string, projectId?: string): Promise<Task[]> {
  const getFallback = () => {
    let list = mockTasks.filter((t) => t.workspace_id === workspaceId);
    if (projectId) {
      list = list.filter((t) => t.project_id === projectId);
    }
    return list;
  };

  if (!isSupabaseConfigured) {
    return getFallback();
  }

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
      console.warn("Error fetching tasks, using fallback:", error.message);
      return getFallback();
    }
    return (data as any[]) || [];
  } catch (err) {
    console.warn("Supabase timeout in getTasks, using fallback:", err);
    return getFallback();
  }
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

  if (!isSupabaseConfigured) {
    const task: Task = {
      id: `mock-task-${Date.now()}`,
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      description,
      status: normalizedStatus,
      priority: normalizedPriority,
      assignee_id: assigneeId,
      due_date: dueDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockTasks.push(task);
    return task;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("createTask failed: User is unauthenticated.");
    throw new Error("User authentication session not found.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title,
      description,
      status: normalizedStatus,
      priority: normalizedPriority,
      assignee_id: assigneeId,
      due_date: dueDate,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating task in Supabase:", error);
    throw new Error(`Database error creating task: ${error.message}`);
  }
  return data as Task;
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

  if (!isSupabaseConfigured) {
    const index = mockTasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      mockTasks[index] = {
        ...mockTasks[index],
        ...cleanUpdates,
        updated_at: new Date().toISOString()
      };
      return mockTasks[index];
    }
    return null;
  }

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
}

export async function deleteTask(taskId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const index = mockTasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      mockTasks.splice(index, 1);
      return true;
    }
    return false;
  }

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
}
