import { createClient } from "@/lib/supabase/server";
import { searchChunks } from "@/lib/services/rag";
import { getProjects } from "@/lib/services/project";
import { getTasks } from "@/lib/services/task";
import { getNotes, getLinks, getCodeSnippets } from "@/lib/services/knowledge";

export interface ProjectContext {
  summary: string;
  tasksContext: string;
  knowledgeFacts: string;
  semanticContext: string;
  recentActivity: string;
}

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper to retrieve semantic matches
export async function retrieveContext(
  workspaceId: string,
  projectId: string,
  queryText: string
): Promise<string> {
  try {
    const matches = await searchChunks(workspaceId, projectId, queryText, 5, 0.15);
    if (matches.length === 0) return "No relevant semantic document fragments found.";
    
    return matches
      .map((match, i) => `[Source: ${match.metadata?.title || "Unknown File"}, Chunk ${i + 1}] (Match Score: ${Math.round(match.similarity * 100)}%)\n${match.content}`)
      .join("\n\n---\n\n");
  } catch (err: any) {
    console.error("ProjectBrain retrieveContext failed:", err);
    return "Failed to retrieve semantic RAG context.";
  }
}

// Helper to retrieve project stats summary
export async function getProjectSummary(projectId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    return "Project: Workspace Agent MVP (Mock Summary)\n- Active Tasks: 1\n- Completed Tasks: 1\n- Knowledge Assets: 3";
  }

  const supabase = await createClient();

  // Query project details
  const { data: project } = await supabase
    .from("projects")
    .select("name, description, status")
    .eq("id", projectId)
    .single();

  if (!project) return "Project not found.";

  // Fetch counts
  const { count: taskCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: docCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  return `Project: ${project.name}\nDescription: ${project.description || "N/A"}\nStatus: ${project.status}\nMetrics: ${taskCount || 0} total tasks, ${docCount || 0} documents indexed.`;
}

// Helper to retrieve notes, snippets, and links
export async function getProjectFacts(workspaceId: string, projectId: string): Promise<string> {
  try {
    const notes = await getNotes(workspaceId, projectId);
    const snippets = await getCodeSnippets(workspaceId, projectId);
    const links = await getLinks(workspaceId, projectId);

    const notesBlock = notes.length > 0 
      ? notes.map(n => `- Note [${n.title}]: ${n.content || "Empty Note"}`).join("\n")
      : "- No notes created.";

    const snippetsBlock = snippets.length > 0
      ? snippets.map(s => `- Code Snippet [${s.title} (${s.language})]: ${s.description || ""} Code:\n\`\`\`${s.language}\n${s.code}\n\`\`\``).join("\n")
      : "- No code snippets saved.";

    const linksBlock = links.length > 0
      ? links.map(l => `- Link [${l.title}]: ${l.url} (${l.description || ""})`).join("\n")
      : "- No links saved.";

    return `### Core Project Notes:\n${notesBlock}\n\n### Saved Code Snippets:\n${snippetsBlock}\n\n### Resource Links:\n${linksBlock}`;
  } catch (err: any) {
    console.error("ProjectBrain getProjectFacts failed:", err);
    return "Failed to fetch project facts.";
  }
}

// Helper to retrieve structured tasks
export async function getRelevantTasks(workspaceId: string, projectId: string): Promise<string> {
  try {
    const tasks = await getTasks(workspaceId, projectId);
    if (tasks.length === 0) return "No tasks defined for this project.";

    return tasks
      .map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Due: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : "None"}) - ${t.description || "No description"}`)
      .join("\n");
  } catch (err: any) {
    console.error("ProjectBrain getRelevantTasks failed:", err);
    return "Failed to retrieve project tasks.";
  }
}

// Helper to retrieve activity logs
export async function getRecentActivity(projectId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    return "- Added initial workspace schemas.\n- Configured auth RLS policies.";
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("action, entity_type, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    return "No recent activity recorded.";
  }

  return data
    .map(act => `[${new Date(act.created_at).toLocaleString()}] ${act.action} (${act.entity_type})`)
    .join("\n");
}

// Combined context generation interface
export async function compileProjectBrainContext(
  workspaceId: string,
  projectId: string,
  queryText: string
): Promise<ProjectContext> {
  const [summary, tasksContext, knowledgeFacts, semanticContext, recentActivity] = await Promise.all([
    getProjectSummary(projectId),
    getRelevantTasks(workspaceId, projectId),
    getProjectFacts(workspaceId, projectId),
    retrieveContext(workspaceId, projectId, queryText),
    getRecentActivity(projectId)
  ]);

  return {
    summary,
    tasksContext,
    knowledgeFacts,
    semanticContext,
    recentActivity
  };
}
