import { chatCompletion, ChatMessage } from "@/lib/ai/groq";
import { AgentContext } from "./context";

export interface PlannedToolCall {
  name: string;
  arguments: any;
}

export interface AgentPlan {
  explanation: string;
  toolCalls: PlannedToolCall[];
}

export async function generateAgentPlan(
  userQuery: string,
  context: AgentContext
): Promise<AgentPlan> {
  const systemPrompt = `You are a precise Agent Planner for a technical workspace manager. Given a user query and the current project context, your job is to identify if the user wants you to take any actions (like creating or updating a task, reading documents, connecting GitHub, etc.).

Examine the list of available tools below:

AVAILABLE TOOLS:
1. "get_project" (args: { projectId: string }) - Get detailed project information.
2. "search_tasks" (args: { workspaceId: string, query?: string, status?: string }) - Find tasks.
3. "create_task" (args: { workspaceId: string, projectId: string, title: string, description?: string, status?: string, priority?: string }) - Create a new task.
4. "update_task" (args: { taskId: string, updates: { title?: string, description?: string, status?: string, priority?: string } }) - Update task.
5. "search_documents" (args: { workspaceId: string, projectId: string, query?: string }) - Find project specification documents.
6. "read_document" (args: { documentId: string }) - Read full text chunks of a document.
7. "search_notes" (args: { workspaceId: string, projectId: string, query?: string }) - Find project notes.
8. "search_code_snippets" (args: { workspaceId: string, projectId: string, query?: string }) - Search code snippets.
9. "get_project_activity" (args: { projectId: string }) - Fetch recent logs.
10. "search_repositories" (args: { workspaceId: string, query: string }) - Search GitHub repos.
11. "get_repository" (args: { workspaceId: string, owner: string, repo: string }) - Get repository metadata.
12. "get_commits" (args: { workspaceId: string, owner: string, repo: string }) - Fetch recent git commits from a GitHub repository.
13. "list_pull_requests" (args: { workspaceId: string, owner: string, repo: string, state?: string }) - List open or closed pull requests in a repository.
14. "get_pull_request" (args: { workspaceId: string, owner: string, repo: string, prNumber: number }) - Get specific pull request details.
15. "search_issues" (args: { workspaceId: string, owner: string, repo: string, query?: string }) - Search issues in a repository.
16. "get_issue" (args: { workspaceId: string, owner: string, repo: string, issueNumber: number }) - Read issue details.
17. "create_issue" (args: { workspaceId: string, owner: string, repo: string, title: string, body?: string }) - Create GitHub issue.
18. "update_issue" (args: { workspaceId: string, owner: string, repo: string, issueNumber: number, updates: { title?: string, body?: string, state?: string } }) - Update GitHub issue.

RULES:
- If the user query is a simple question (e.g. "What is the tech stack?") that can be answered from the document chunks or notes in the context, do NOT plan any tool calls. Return an empty toolCalls array.
- If the user wants to perform an action (e.g. "Add a task to check RLS" or "Read the security specifications document"), return the appropriate tool call(s) with correct argument fields filled.
- Fill workspaceId and projectId parameters using the active metadata:
  * Workspace ID: "${context.workspaceId}"
  * Project ID: "${context.projectId}"

You MUST respond with a raw valid JSON object matching the following structure:
{
  "explanation": "Brief explanation of what the user wants to do and why you selected these tools",
  "toolCalls": [
    {
      "name": "tool_name",
      "arguments": { ... }
    }
  ]
}

Ensure your output is strictly a JSON block. Do not wrap in markdown code blocks or add conversational conversational text before/after.`;

  try {
    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery }
    ];

    const responseText = await chatCompletion(apiMessages, "openai/gpt-oss-120b", 0.0);
    
    // Clean JSON response
    const jsonStr = responseText.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const plan: AgentPlan = JSON.parse(jsonStr);
    
    return plan;
  } catch (err: any) {
    console.error("Failed to generate agent plan:", err);
    return {
      explanation: "Failed to compile structured plan. Defaulting to general conversation.",
      toolCalls: []
    };
  }
}
