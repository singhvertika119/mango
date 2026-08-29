export type RiskLevel = "READ" | "WRITE" | "DANGEROUS";

export interface ToolPermission {
  name: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

const TOOL_PERMISSIONS: Record<string, ToolPermission> = {
  // Read actions: automatic
  "search_projects": { name: "search_projects", riskLevel: "READ", requiresApproval: false },
  "get_project": { name: "get_project", riskLevel: "READ", requiresApproval: false },
  "search_tasks": { name: "search_tasks", riskLevel: "READ", requiresApproval: false },
  "search_documents": { name: "search_documents", riskLevel: "READ", requiresApproval: false },
  "read_document": { name: "read_document", riskLevel: "READ", requiresApproval: false },
  "search_notes": { name: "search_notes", riskLevel: "READ", requiresApproval: false },
  "search_code_snippets": { name: "search_code_snippets", riskLevel: "READ", requiresApproval: false },
  "get_project_activity": { name: "get_project_activity", riskLevel: "READ", requiresApproval: false },
  
  "search_repositories": { name: "search_repositories", riskLevel: "READ", requiresApproval: false },
  "get_repository": { name: "get_repository", riskLevel: "READ", requiresApproval: false },
  "search_issues": { name: "search_issues", riskLevel: "READ", requiresApproval: false },
  "get_issue": { name: "get_issue", riskLevel: "READ", requiresApproval: false },
  "get_pull_request": { name: "get_pull_request", riskLevel: "READ", requiresApproval: false },
  "get_commits": { name: "get_commits", riskLevel: "READ", requiresApproval: false },

  // Write actions: require user approval
  "create_task": { name: "create_task", riskLevel: "WRITE", requiresApproval: true },
  "update_task": { name: "update_task", riskLevel: "WRITE", requiresApproval: true },
  "create_issue": { name: "create_issue", riskLevel: "WRITE", requiresApproval: true },
  "update_issue": { name: "update_issue", riskLevel: "WRITE", requiresApproval: true },

  // Dangerous actions: require explicit verification
  "delete_task": { name: "delete_task", riskLevel: "DANGEROUS", requiresApproval: true }
};

export function getToolPermission(toolName: string): ToolPermission {
  const perm = TOOL_PERMISSIONS[toolName];
  if (!perm) {
    // Default fallback to WRITE for safety on unknown tools
    return { name: toolName, riskLevel: "WRITE", requiresApproval: true };
  }
  return perm;
}

export function isActionAuthorized(toolName: string, role: string): boolean {
  const perm = getToolPermission(toolName);
  
  // VIEWERS can only perform READ actions
  if (role === "VIEWER" && perm.riskLevel !== "READ") {
    return false;
  }
  
  return true;
}
