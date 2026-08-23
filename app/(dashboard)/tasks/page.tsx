"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { getProjectsAction } from "@/app/actions/project";
import { createTaskAction, getTasksAction, updateTaskAction, deleteTaskAction } from "@/app/actions/task";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "Todo" | "In Progress" | "Review" | "Completed" | "Blocked";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
}

const columns: { name: Task["status"]; color: string }[] = [
  { name: "Todo", color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  { name: "In Progress", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { name: "Review", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "Completed", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { name: "Blocked", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" }
];

export default function TasksPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Task Creation Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [status, setStatus] = React.useState<Task["status"]>("Todo");
  const [priority, setPriority] = React.useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);

    // Fetch projects first
    const projectsRes = await getProjectsAction(workspaceId);
    if (projectsRes.success && projectsRes.projects) {
      setProjects(projectsRes.projects);
      if (projectsRes.projects.length > 0) {
        setSelectedProjectId(projectsRes.projects[0].id);
      }
    }

    // Fetch tasks
    const tasksRes = await getTasksAction(workspaceId);
    if (tasksRes.success && tasksRes.tasks) {
      setTasks(tasksRes.tasks as Task[]);
    } else {
      setError(tasksRes.error || "Failed to fetch tasks.");
    }
    setLoading(false);
  }, [workspaceId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !selectedProjectId || !title.trim()) return;

    setCreating(true);
    const res = await createTaskAction(
      workspaceId,
      selectedProjectId,
      title.trim(),
      description.trim() || null,
      status,
      priority,
      null, // assigneeId
      dueDate || null
    );
    setCreating(false);

    if (res.success && res.task) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleStatusChange = async (taskId: string, nextStatus: Task["status"]) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    const res = await updateTaskAction(taskId, { status: nextStatus });
    if (!res.success) {
      fetchData(); // Rollback if failed
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await deleteTaskAction(taskId);
  };

  const getPriorityBadgeColor = (prio: Task["priority"]) => {
    switch (prio) {
      case "urgent":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "high":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "medium":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "low":
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <CheckSquare className="w-12 h-12 text-muted-foreground stroke-1" />
        <h3 className="mt-4 text-lg font-semibold">No active workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select or create a workspace from the sidebar switcher to view tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and complete development cycles across your board
          </p>
        </div>
        <Button
          className="gap-2 cursor-pointer"
          onClick={() => {
            if (projects.length === 0) {
              setError("Please create a project first before adding tasks.");
            } else {
              setDialogOpen(true);
            }
          }}
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 border-solid max-w-md">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {columns.map((col) => (
            <div key={col.name} className="space-y-3">
              <div className="h-9 w-full bg-accent animate-pulse rounded-lg" />
              <div className="h-32 w-full bg-accent animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card text-card-foreground">
          <FolderOpen className="w-12 h-12 text-muted-foreground stroke-1" />
          <h3 className="mt-4 text-lg font-semibold">No Projects Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
            You must create at least one project in this workspace before you can add tasks.
          </p>
        </div>
      ) : (
        /* Kanban Board Grid */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {columns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.name);
            return (
              <div key={col.name} className="flex flex-col gap-3 bg-card/40 border border-border border-solid p-3 rounded-xl min-h-[500px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-1 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", col.color)}>
                      {col.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">{columnTasks.length}</span>
                  </div>
                </div>

                {/* Column Body Cards */}
                <div className="space-y-3.5 flex-1">
                  {columnTasks.map((task) => {
                    const taskProject = projects.find((p) => p.id === task.project_id);
                    return (
                      <Card
                        key={task.id}
                        className="group border-border bg-card hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                        <CardHeader className="p-4 pb-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-[10px] font-bold border border-solid px-1.5 py-0.5 rounded uppercase", getPriorityBadgeColor(task.priority))}>
                              {task.priority}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col.name !== "Completed" && (
                                <button
                                  onClick={() => handleStatusChange(task.id, "Completed")}
                                  title="Mark Completed"
                                  className="text-muted-foreground hover:text-emerald-500 cursor-pointer p-0.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete Task"
                                className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <CardTitle className="text-sm font-semibold leading-tight pt-1">
                            {task.title}
                          </CardTitle>
                          {taskProject && (
                            <span className="text-[10px] text-muted-foreground font-medium block">
                              {taskProject.name}
                            </span>
                          )}
                        </CardHeader>
                        {task.description && (
                          <CardContent className="p-4 pt-0 pb-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {task.description}
                          </CardContent>
                        )}
                        <div className="flex items-center justify-between border-t border-border p-3 pt-2 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {task.due_date ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date"}
                            </span>
                          </div>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as Task["status"])}
                            className="bg-transparent border-0 font-medium text-foreground cursor-pointer focus:ring-0 text-[10px] outline-none"
                          >
                            {columns.map((c) => (
                              <option key={c.name} value={c.name} className="text-foreground dark:bg-card">
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Card>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-card/10">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task deliverable to your projects board.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="taskTitle">Task Title</Label>
              <Input
                id="taskTitle"
                type="text"
                placeholder="Integrate Supabase Auth callbacks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taskDesc">Description</Label>
              <textarea
                id="taskDesc"
                rows={3}
                placeholder="Implement redirect route filters and handle session states."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="taskProj">Project</Label>
                <select
                  id="taskProj"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taskStatus">Status</Label>
                <select
                  id="taskStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task["status"])}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="taskPrio">Priority</Label>
                <select
                  id="taskPrio"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task["priority"])}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taskDue">Due Date</Label>
                <Input
                  id="taskDue"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
