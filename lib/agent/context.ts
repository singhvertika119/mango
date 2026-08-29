import { compileProjectBrainContext, ProjectContext } from "@/lib/rag/project-brain";
import { getIntegrationsAction } from "@/app/actions/integrations";

export interface AgentContext {
  workspaceId: string;
  projectId: string;
  userId: string;
  userEmail: string;
  githubConnected: boolean;
  projectBrain: ProjectContext;
}

export async function gatherAgentContext(
  workspaceId: string,
  projectId: string,
  userId: string,
  userEmail: string,
  userMessage: string
): Promise<AgentContext> {
  const [projectBrain, integrationStatus] = await Promise.all([
    compileProjectBrainContext(workspaceId, projectId, userMessage),
    getIntegrationsAction(workspaceId)
  ]);

  return {
    workspaceId,
    projectId,
    userId,
    userEmail,
    githubConnected: !!integrationStatus.connected,
    projectBrain
  };
}
