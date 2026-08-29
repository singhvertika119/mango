import * as tools from "@/lib/mcp/tools";

export interface ToolCall {
  name: string;
  arguments: any;
}

export async function executeAgentTool(
  toolCall: ToolCall,
  workspaceId: string,
  projectId: string
): Promise<any> {
  const { name, arguments: args } = toolCall;
  console.log(`Executing tool: ${name} with args:`, args);

  try {
    switch (name) {
      // Workspace tools
      case "search_projects":
        return await tools.searchProjects(workspaceId, args.query);
      case "get_project":
        return await tools.getProject(args.projectId || projectId);
      case "search_tasks":
        return await tools.searchTasks(workspaceId, args.projectId || projectId, args.query, args.status);
      case "create_task":
        return await tools.createWorkspaceTask(
          workspaceId,
          args.projectId || projectId,
          args.title,
          args.description,
          args.status || "Todo",
          args.priority || "medium"
        );
      case "update_task":
        return await tools.updateWorkspaceTask(args.taskId, args.updates);
      case "search_documents":
        return await tools.searchDocuments(workspaceId, args.projectId || projectId, args.query);
      case "read_document":
        return await tools.readDocument(args.documentId);
      case "search_notes":
        return await tools.searchNotes(workspaceId, args.projectId || projectId, args.query);
      case "search_code_snippets":
        return await tools.searchCodeSnippets(workspaceId, args.projectId || projectId, args.query);
      case "get_project_activity":
        return await tools.getProjectActivity(args.projectId || projectId);

      // GitHub tools
      case "search_repositories":
        return await tools.searchRepositories(workspaceId, args.query);
      case "get_repository":
        return await tools.getRepository(workspaceId, args.owner, args.repo);
      case "search_issues":
        return await tools.searchIssues(workspaceId, args.owner, args.repo, args.query);
      case "get_issue":
        return await tools.getIssue(workspaceId, args.owner, args.repo, args.issueNumber);
      case "get_pull_request":
        return await tools.getPullRequest(workspaceId, args.owner, args.repo, args.prNumber);
      case "get_commits":
        return await tools.getCommits(workspaceId, args.owner, args.repo);
      case "create_issue":
        return await tools.createIssue(workspaceId, args.owner, args.repo, args.title, args.body);
      case "update_issue":
        return await tools.updateIssue(workspaceId, args.owner, args.repo, args.issueNumber, args.updates);

      default:
        throw new Error(`Unknown tool name: ${name}`);
    }
  } catch (err: any) {
    console.error(`Tool execution failed: ${name}`, err);
    throw new Error(err.message || `Failed to execute tool ${name}`);
  }
}
