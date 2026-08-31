import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/services/project";
import { getTasks, createTask, updateTask, deleteTask } from "@/lib/services/task";
import { getNotes, getLinks, getCodeSnippets } from "@/lib/services/knowledge";
import { decrypt } from "@/lib/utils/crypto";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper to decrypt integrations token
async function getGithubToken(workspaceId: string): Promise<string | null> {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GITHUB_PAT) return process.env.GITHUB_PAT;

  if (!isSupabaseConfigured) return null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("integrations")
      .select("credentials")
      .eq("workspace_id", workspaceId)
      .eq("provider", "github")
      .single();

    if (data?.credentials) {
      try {
        return decrypt(data.credentials);
      } catch {
        // Fallback in case raw string was stored
        return data.credentials;
      }
    }
  } catch (e) {
    console.error("Failed to retrieve integration credentials:", e);
  }
  return null;
}

// ==========================================
// WORKSPACE TOOLS
// ==========================================

export async function searchProjects(workspaceId: string, query?: string) {
  const projects = await getProjects(workspaceId);
  if (!query) return projects;
  return projects.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.description?.toLowerCase().includes(query.toLowerCase())
  );
}

export async function getProject(projectId: string) {
  if (!isSupabaseConfigured) {
    return {
      id: projectId,
      workspace_id: "mango-default-ws",
      name: "Workspace Agent MVP",
      description: "Build Next.js + Supabase foundation, auth, layouts, and mock workspaces.",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !data) {
    throw new Error(`Project ${projectId} not found: ${error?.message || "Not found"}`);
  }
  return data;
}

export async function searchTasks(workspaceId: string, projectId?: string, query?: string, status?: string) {
  let tasks = await getTasks(workspaceId, projectId);
  if (query) {
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(query.toLowerCase()) || 
      t.description?.toLowerCase().includes(query.toLowerCase())
    );
  }
  if (status) {
    tasks = tasks.filter(t => t.status.toLowerCase() === status.toLowerCase());
  }
  return tasks;
}

export async function createWorkspaceTask(
  workspaceId: string,
  projectId: string,
  title: string,
  description?: string,
  status: any = "Todo",
  priority: any = "medium"
) {
  const task = await createTask(workspaceId, projectId, title, description || null, status, priority);
  if (!task) throw new Error("Failed to create task.");
  return task;
}

export async function updateWorkspaceTask(taskId: string, updates: any) {
  const task = await updateTask(taskId, updates);
  if (!task) throw new Error("Failed to update task.");
  return task;
}

export async function searchDocuments(workspaceId: string, projectId: string, query?: string) {
  if (!isSupabaseConfigured) {
    return [{ id: "mock-doc-1", title: "security_spec.md", type: "md", status: "completed" }];
  }

  const supabase = await createClient();
  let dbQuery = supabase
    .from("documents")
    .select("*, files(*)")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId);

  if (query) {
    dbQuery = dbQuery.ilike("title", `%${query}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data || [];
}

export async function readDocument(documentId: string) {
  if (!isSupabaseConfigured) {
    return "This is mock document contents containing security specifications: all credentials must be encrypted.";
  }

  const supabase = await createClient();
  const { data: chunks, error } = await supabase
    .from("document_chunks")
    .select("content, chunk_index")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;
  if (!chunks || chunks.length === 0) return "Document contains no text chunks.";

  return chunks.map(c => c.content).join("\n\n---\n\n");
}

export async function searchNotes(workspaceId: string, projectId: string, query?: string) {
  const notes = await getNotes(workspaceId, projectId);
  if (!query) return notes;
  return notes.filter(n => 
    n.title.toLowerCase().includes(query.toLowerCase()) || 
    n.content?.toLowerCase().includes(query.toLowerCase())
  );
}

export async function searchCodeSnippets(workspaceId: string, projectId: string, query?: string) {
  const snippets = await getCodeSnippets(workspaceId, projectId);
  if (!query) return snippets;
  return snippets.filter(s => 
    s.title.toLowerCase().includes(query.toLowerCase()) || 
    s.description?.toLowerCase().includes(query.toLowerCase()) ||
    s.code.toLowerCase().includes(query.toLowerCase())
  );
}

export async function getProjectActivity(projectId: string) {
  if (!isSupabaseConfigured) {
    return [{ action: "Init schema", entity_type: "migration", created_at: new Date().toISOString() }];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) throw error;
  return data || [];
}

// ==========================================
// GITHUB TOOLS (Supports Personal Tokens and fallback mocks)
// ==========================================

async function githubFetch(url: string, workspaceId: string, options: RequestInit = {}) {
  const token = await getGithubToken(workspaceId);
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Workspace-Agent-NextJS"
  };

  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const res = await fetch(`https://api.github.com${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API returned status ${res.status}: ${errorText}`);
  }

  return res.json();
}

export async function searchRepositories(workspaceId: string, query: string) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return {
      items: [
        { id: 12345, name: "mango-agent", full_name: "singhvertika119/mango-agent", description: "Mock Agent Project" }
      ]
    };
  }
  const res = await githubFetch(`/search/repositories?q=${encodeURIComponent(query)}&per_page=8`, workspaceId);
  if (res.items && Array.isArray(res.items)) {
    return {
      items: res.items.slice(0, 8).map((r: any) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url
      }))
    };
  }
  return res;
}

export async function getRepository(workspaceId: string, owner: string, repo: string) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return { name: repo, owner: { login: owner }, description: "Offline Mock Repository Details" };
  }
  const r = await githubFetch(`/repos/${owner}/${repo}`, workspaceId);
  return {
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    open_issues: r.open_issues_count,
    default_branch: r.default_branch
  };
}

export async function searchIssues(workspaceId: string, owner: string, repo: string, query?: string) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return [
      { number: 1, title: "Configure Groq provider model deprecated", state: "open", body: "Llama model is decommissioned." }
    ];
  }
  const qStr = query ? `+${encodeURIComponent(query)}` : "";
  const res = await githubFetch(`/search/issues?q=repo:${owner}/${repo}${qStr}&per_page=8`, workspaceId);
  const items = res.items || res;
  if (Array.isArray(items)) {
    return items.slice(0, 8).map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      user: issue.user?.login,
      body: issue.body ? issue.body.slice(0, 300) : "",
      created_at: issue.created_at
    }));
  }
  return res;
}

export async function getIssue(workspaceId: string, owner: string, repo: string, issueNumber: number) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return { number: issueNumber, title: `Mock Issue ${issueNumber}`, state: "open", body: "Body details." };
  }
  const issue = await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}`, workspaceId);
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    user: issue.user?.login,
    body: issue.body ? issue.body.slice(0, 600) : "",
    created_at: issue.created_at
  };
}

export async function listPullRequests(workspaceId: string, owner: string, repo: string, state: string = "open") {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return [
      { number: 1, title: "Initial MCP Server integration", state: "open", user: "developer", created_at: new Date().toISOString() }
    ];
  }
  const data = await githubFetch(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=8`, workspaceId);
  if (!Array.isArray(data)) return data;
  return data.slice(0, 8).map((pr: any) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    user: pr.user?.login,
    created_at: pr.created_at,
    html_url: pr.html_url
  }));
}

export async function getPullRequest(workspaceId: string, owner: string, repo: string, prNumber: number) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return { number: prNumber, title: `Mock PR ${prNumber}`, state: "open", diff_url: "" };
  }
  const pr = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`, workspaceId);
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    user: pr.user?.login,
    body: pr.body ? pr.body.slice(0, 500) : "",
    created_at: pr.created_at,
    html_url: pr.html_url
  };
}

export async function getCommits(workspaceId: string, owner: string, repo: string) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return [{ sha: "abcdef7", message: "Mock Commit message", author: "Antigravity", date: new Date().toISOString() }];
  }
  const data = await githubFetch(`/repos/${owner}/${repo}/commits?per_page=8`, workspaceId);
  if (!Array.isArray(data)) return data;
  return data.slice(0, 8).map((c: any) => ({
    sha: c.sha?.substring(0, 7),
    message: c.commit?.message?.split("\n")[0],
    author: c.commit?.author?.name || c.author?.login || "Unknown",
    date: c.commit?.author?.date || c.commit?.committer?.date
  }));
}

export async function createIssue(workspaceId: string, owner: string, repo: string, title: string, body?: string) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return { number: 99, title, body, state: "open" };
  }
  const created = await githubFetch(`/repos/${owner}/${repo}/issues`, workspaceId, {
    method: "POST",
    body: JSON.stringify({ title, body })
  });
  return {
    number: created.number,
    title: created.title,
    state: created.state,
    html_url: created.html_url
  };
}

export async function updateIssue(workspaceId: string, owner: string, repo: string, issueNumber: number, updates: any) {
  const token = await getGithubToken(workspaceId);
  if (!token) {
    return { number: issueNumber, ...updates, state: "closed" };
  }
  const updated = await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}`, workspaceId, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
  return {
    number: updated.number,
    title: updated.title,
    state: updated.state
  };
}
