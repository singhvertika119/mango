"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FolderKanban, Plus, Calendar, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
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
import { createProjectAction, getProjectsAction } from "@/app/actions/project";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  target_date: string | null;
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const fetchProjects = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    const res = await getProjectsAction(workspaceId);
    if (res.success && res.projects) {
      setProjects(res.projects);
    } else {
      setError(res.error || "Failed to fetch projects.");
    }
    setLoading(false);
  }, [workspaceId]);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim()) return;

    setCreating(true);
    const res = await createProjectAction(
      workspaceId,
      name.trim(),
      description.trim() || null,
      startDate || undefined,
      targetDate || undefined
    );
    setCreating(false);

    if (res.success && res.project) {
      setName("");
      setDescription("");
      setStartDate("");
      setTargetDate("");
      setDialogOpen(false);
      fetchProjects();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <FolderKanban className="w-12 h-12 text-muted-foreground stroke-1" />
        <h3 className="mt-4 text-lg font-semibold">No active workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select or create a workspace from the sidebar switcher to view projects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team's development streams</p>
        </div>
        <Button className="gap-2 cursor-pointer" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border animate-pulse bg-card">
              <div className="h-32 p-6 space-y-4">
                <div className="h-5 w-2/3 bg-accent rounded" />
                <div className="h-4 w-5/6 bg-accent rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2.5 p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 border-solid max-w-md">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card text-card-foreground">
          <FolderKanban className="w-12 h-12 text-muted-foreground stroke-1" />
          <h3 className="mt-4 text-lg font-semibold">No projects created yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
            Create a project to start organizing tasks, code snippets, notes, and documents.
          </p>
          <Button className="mt-4 cursor-pointer" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            <span>Create First Project</span>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => (
            <Card key={proj.id} className="border-border bg-card hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <FolderKanban className="w-5 h-5" />
                  <CardTitle className="text-base font-bold truncate">{proj.name}</CardTitle>
                </div>
                <CardDescription className="pt-2 leading-relaxed line-clamp-3 h-12">
                  {proj.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground space-y-2 border-t border-border mt-4 p-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timeline: {formatDate(proj.start_date)} - {formatDate(proj.target_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="capitalize">Status: <span className="font-semibold text-foreground">{proj.status}</span></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new engineering stream. Projects group related tasks, documents, and code.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="projName">Project Name</Label>
              <Input
                id="projName"
                type="text"
                placeholder="Database Sync Pipeline"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="projDesc">Description</Label>
              <textarea
                id="projDesc"
                rows={3}
                placeholder="Integrates Supabase vector databases with external MCP sync protocols."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="projStart">Start Date</Label>
                <Input
                  id="projStart"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="projTarget">Target Date</Label>
                <Input
                  id="projTarget"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
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
