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
  const [userName, setUserName] = React.useState("Developer");

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(async (res: any) => {
        const user = res?.data?.user;
        if (user) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user.id)
              .single();
            if (profile?.full_name) {
              const firstName = (profile.full_name as string).split(" ")[0];
              setUserName(firstName);
            }
          } catch (e) {
            console.error("Failed to load user name:", e);
          }
        }
      })
      .catch((err: any) => {
        console.warn("Could not retrieve user in dashboard:", err?.message);
      });
  }, []);

  const loadData = React.useCallback(async () => {
    if (!workspaceId) return;
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

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <Layers className="w-12 h-12 text-muted-foreground stroke-1 animate-pulse" />
        <h3 className="mt-4 text-lg font-semibold">Select a workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select or create a workspace from the sidebar switcher to load your project dashboard metrics.
        </p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-linear-to-r from-primary/10 via-primary/5 to-card rounded-2xl border border-primary/10 border-solid shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, {userName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace Mango is active. The AI project agent is ready to assist you.
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
