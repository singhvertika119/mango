"use server";

import { createClient } from "@/lib/supabase/server";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getDashboardDataAction(workspaceId: string) {
  if (!isSupabaseConfigured) {
    // Return mock dynamic stats
    return {
      success: true,
      stats: {
        totalTasks: 6,
        completedTasks: 3,
        inProgressTasks: 2,
        progressPercentage: 50,
        documentsCount: 2,
        githubConnected: true,
        githubRepo: "singhvertika119/mango"
      },
      activities: [
        { id: "act-1", message: "Approved and executed agent action: create_task 'Audit RLS policies'", user: "You", time: "10m ago" },
        { id: "act-2", message: "Uploaded Mango_PRD.md to Knowledge Base", user: "You", time: "2h ago" },
        { id: "act-3", message: "Initial commit parsed for project setup", user: "git-bot", time: "1d ago" }
      ]
    };
  }

  try {
    const supabase = await createClient();
    
    // 1. Fetch Tasks Stats
    const { data: tasks, error: tasksErr } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("workspace_id", workspaceId);
      
    if (tasksErr) throw tasksErr;
    
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === "Completed" || t.status === "Review").length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === "In Progress").length || 0;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. Fetch Knowledge base documents count
    const { count: docsCount, error: docsErr } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (docsErr) throw docsErr;

    // 3. Fetch GitHub Integration status
    const { data: integration, error: intErr } = await supabase
      .from("integrations")
      .select("settings")
      .eq("workspace_id", workspaceId)
      .eq("provider", "github")
      .maybeSingle();

    if (intErr) throw intErr;

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

    if (actErr) throw actErr;

    // Helper to format timestamps to relative time strings (e.g. "5m ago")
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
      const userName = (act.profiles as any)?.full_name || (act.profiles as any)?.email || "System";
      return {
        id: act.id,
        message: act.action,
        user: userName,
        time: formatRelativeTime(act.created_at)
      };
    });

    return {
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        progressPercentage,
        documentsCount: docsCount || 0,
        githubConnected: !!integration,
        githubRepo: (integration?.settings as any)?.repo_name || "singhvertika119/mango"
      },
      activities: formattedActivities
    };
  } catch (err: any) {
    console.error("Failed to load dashboard data action:", err);
    return { success: false, error: err.message || "Failed to load dashboard data." };
  }
}
