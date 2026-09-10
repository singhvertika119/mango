"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  GitBranch,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Play,
  Loader2,
  Calendar,
  Layers,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardDataAction } from "@/app/actions/dashboard";
import { createWorkspaceAction, getWorkspacesAction } from "@/app/actions/workspace";
import { createClient } from "@/lib/supabase/client";

const mockInsights = [
  { id: 1, title: "Database Performance Boost", text: "Create an index on workspace_members(profile_id) to improve query response times by up to 40%." },
  { id: 2, title: "GitHub Sync Alert", text: "The PRD has been modified. The agent recommends creating a sync task to update tasks accordingly." }
];

interface Stats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progressPercentage: number;
  documentsCount: number;
  githubConnected: boolean;
  githubRepo: string;
}

interface Activity {
  id: string;
  message: string;
  user: string;
  time: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const router = useRouter();

  const [stats, setStats] = React.useState<Stats | null>(null);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState("");
  const [availableWorkspaces, setAvailableWorkspaces] = React.useState<any[]>([]);
  const [creatingWorkspace, setCreatingWorkspace] = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(async (res: any) => {
        const user = res?.data?.user;
        if (user) {
          let name = user.user_metadata?.full_name || user.user_metadata?.name || "";
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user.id)
              .single();
            if (profile?.full_name) {
              name = profile.full_name;
            }
          } catch (e) {
            // ignore
          }

          if (!name && user.email) {
            const prefix = user.email.split("@")[0];
            name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
          }

          const firstName = (name || "there").split(" ")[0];
          setUserName(firstName);
        }
      })
      .catch((err: any) => {
        console.warn("Could not retrieve user in dashboard:", err?.message);
      });
  }, []);

  const loadData = React.useCallback(async () => {
    if (!workspaceId) {
      // Load available workspaces for the empty state
      const wsRes = await getWorkspacesAction();
      if (wsRes.success && wsRes.workspaces) {
        setAvailableWorkspaces(wsRes.workspaces);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getDashboardDataAction(workspaceId);
    if (res.success && res.stats && res.activities) {
      setStats(res.stats);
      setActivities(res.activities);
    } else {
      setError(res.error || "Failed to load dashboard statistics.");
    }
    setLoading(false);
  }, [workspaceId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickCreateWorkspace = async () => {
    setCreatingWorkspace(true);
    const res = await createWorkspaceAction("My Workspace");
    setCreatingWorkspace(false);
    if (res.success && res.workspace) {
      router.push(`/dashboard?workspaceId=${res.workspace.id}`);
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh] max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 text-primary flex items-center justify-center mb-4 border border-amber-500/30">
          <Layers className="w-8 h-8 text-primary stroke-2" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-foreground">Welcome to Mango{userName ? `, ${userName}` : ""}!</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Select an existing workspace or create a new workspace to start tracking tasks, managing docs, and activating AI agents.
        </p>

        {availableWorkspaces.length > 0 ? (
          <div className="w-full mt-6 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Workspaces</span>
            <div className="grid gap-2">
              {availableWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => router.push(`/dashboard?workspaceId=${ws.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-card hover:bg-accent border border-border transition-all cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                      {ws.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{ws.name}</h4>
                      <p className="text-xs text-muted-foreground">Click to enter workspace</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
            <div className="pt-3">
              <Button
                variant="outline"
                onClick={handleQuickCreateWorkspace}
                disabled={creatingWorkspace}
                className="w-full text-xs font-semibold gap-2 h-9 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{creatingWorkspace ? "Creating..." : "Create Another Workspace"}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <Button
              onClick={handleQuickCreateWorkspace}
              disabled={creatingWorkspace}
              className="gap-2 font-semibold text-sm px-6 h-10 cursor-pointer shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              <span>{creatingWorkspace ? "Creating Workspace..." : "Create My First Workspace"}</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-semibold">Compiling workspace data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-card rounded-2xl border border-primary/10 border-solid shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back{userName ? `, ${userName}` : ""}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mango workspace is active. The AI project agent is ready to assist you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2 cursor-pointer text-xs font-semibold h-9" onClick={() => router.push(`/tasks?workspaceId=${workspaceId}`)}>
            <Plus className="w-4 h-4" />
            <span>Manage Tasks</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Grid */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Progress Card */}
          <Card className="border-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Progress</CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold tracking-tight">{stats.progressPercentage}%</div>
              <div className="w-full bg-accent rounded-full h-1.5 mt-2 overflow-hidden border border-solid border-border">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                {stats.completedTasks} of {stats.totalTasks} tasks completed
              </p>
            </CardContent>
          </Card>

          {/* Tasks Stats */}
          <Card className="border-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Progress</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold tracking-tight">{stats.inProgressTasks}</div>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                Active engineering cycles
              </p>
            </CardContent>
          </Card>

          {/* Knowledge Base Documents */}
          <Card className="border-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Knowledge Base</CardTitle>
              <FileText className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold tracking-tight">{stats.documentsCount}</div>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                Parsed specification files
              </p>
            </CardContent>
          </Card>

          {/* GitHub Status */}
          <Card className="border-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">GitHub Integration</CardTitle>
              <GitBranch className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className={`text-2xl font-bold tracking-tight ${stats.githubConnected ? "text-emerald-500" : "text-muted-foreground"}`}>
                {stats.githubConnected ? "Connected" : "Disconnected"}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 truncate font-medium">
                {stats.githubConnected ? (
                  <span>Repo: <code className="text-[10px] font-mono bg-accent border border-solid border-border px-1.5 py-0.5 rounded">{stats.githubRepo}</code></span>
                ) : (
                  <span>Visit integrations page to connect</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity */}
        <Card className="md:col-span-2 border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <div>
              <CardTitle className="text-sm font-bold">Workspace Activity Log</CardTitle>
              <CardDescription className="text-xs">Audits of actions, modifications, and git events</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border p-4 pt-0">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/60 stroke-1" />
                <p className="text-xs text-muted-foreground mt-2">No activity records logged in this workspace yet.</p>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5 ring-4 ring-primary/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-normal">{act.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      By {act.user} • {act.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl animate-pulse" />
          <CardHeader className="p-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Sparkles className="w-4 h-4 fill-current text-primary" />
              <span>AI Agent Insights</span>
            </div>
            <CardDescription className="text-xs">Contextual project analysis compiled from your RAG base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 p-4 pt-0">
            {mockInsights.map((insight) => (
              <div key={insight.id} className="space-y-1.5 p-3 rounded-lg bg-accent/30 border border-border border-solid text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{insight.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{insight.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Workspace Dashboard...</div>}>
      <DashboardContent />
    </React.Suspense>
  );
}
