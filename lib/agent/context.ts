import { compileProjectBrainContext, ProjectContext } from "@/lib/rag/project-brain";
import { getIntegrationsAction } from "@/app/actions/integrations";
import { getProject } from "@/lib/services/project";

export interface AgentContext {
  workspaceId: string;
  projectId: string;
  userId: string;
  userEmail: string;
  githubConnected: boolean;
  githubRepo?: string | null;
  projectBrain: ProjectContext;
}

export async function gatherAgentContext(
  workspaceId: string,
  projectId: string,
  userId: string,
  userEmail: string,
  userMessage: string
): Promise<AgentContext> {
  const [projectBrain, integrationStatus, project] = await Promise.all([
    compileProjectBrainContext(workspaceId, projectId, userMessage),
    getIntegrationsAction(workspaceId),
    getProject(projectId)
  ]);

  return {
    workspaceId,
    projectId,
    userId,
    userEmail,
    githubConnected: !!(integrationStatus.connected && integrationStatus.isValid !== false),
    githubRepo: project?.github_repo || null,
    projectBrain
  };
}
