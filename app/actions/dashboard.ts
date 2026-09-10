"use server";

import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progressPercentage: number;
  documentsCount: number;
  githubConnected: boolean;
  githubRepo: string;
}

export interface DashboardActivity {
  id: string;
  message: string;
  user: string;
  time: string;
}

export interface DashboardDataResult {
  success: boolean;
  stats?: DashboardStats;
  activities?: DashboardActivity[];
  error?: string;
}

export async function getDashboardDataAction(workspaceId: string): Promise<DashboardDataResult> {
  try {
    const supabase = await createClient();
    
    // 1. Fetch Tasks Stats
    const { data: tasks, error: tasksErr } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("workspace_id", workspaceId);
      
    if (tasksErr) {
      console.error("Error fetching tasks for dashboard:", tasksErr.message);
    }
    
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === "Completed" || t.status === "Review").length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === "In Progress").length || 0;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. Fetch Knowledge base documents count
    const { count: docsCount, error: docsErr } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (docsErr) {
      console.error("Error fetching docs count for dashboard:", docsErr.message);
    }

    // 3. Fetch GitHub Integration & Project status
    const { data: projectData } = await supabase
      .from("projects")
      .select("github_repo")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle();

    const { data: integration } = await supabase
      .from("integrations")
      .select("settings")
      .eq("workspace_id", workspaceId)
      .eq("provider", "github")
      .maybeSingle();

    // 4. Fetch Activities
    const { data: activities, error: actErr } = await supabase
      .from("activities")
      .select(`
        id,
        action,
        created_at,
        profiles (
          full_name,
          email
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (actErr) {
      console.error("Error fetching activities for dashboard:", actErr.message);
    }

    const formatRelativeTime = (isoString: string) => {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    };

    const formattedActivities = (activities || []).map(act => {
      const userName = (act.profiles as any)?.full_name || (act.profiles as any)?.email || "User";
      return {
        id: act.id,
        message: act.action,
        user: userName,
        time: formatRelativeTime(act.created_at)
      };
    });

    const githubRepo = projectData?.github_repo || (integration?.settings as any)?.repo_name || "";
    const isGithubConnected = Boolean(projectData?.github_repo || integration);

    return {
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        progressPercentage,
        documentsCount: docsCount || 0,
        githubConnected: isGithubConnected,
        githubRepo: githubRepo || "Not Connected"
      },
      activities: formattedActivities
    };
  } catch (err: any) {
    console.error("getDashboardDataAction error:", err?.message);
    return {
      success: true,
      stats: {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        progressPercentage: 0,
        documentsCount: 0,
        githubConnected: false,
        githubRepo: "Not Connected"
      },
      activities: []
    };
  }
}
