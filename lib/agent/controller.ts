import { gatherAgentContext, AgentContext } from "./context";
import { generateAgentPlan, AgentPlan } from "./planner";
import { getToolPermission } from "./permissions";
import { createApprovalRequest } from "./approvals";
import { executeAgentTool } from "./executor";
import { verifyToolExecution } from "./verifier";
import { chatCompletion, ChatMessage } from "@/lib/ai/groq";
import { createClient } from "@/lib/supabase/server";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Unified generative answer function
async function generateContextualAnswer(
  userQuery: string,
  context: AgentContext,
  toolExecutionLog?: string
): Promise<string> {
  const brain = context.projectBrain;

  const systemPrompt = `You are a helpful, context-aware Workspace Agent. Answer the user's query clearly and accurately using the context provided below.

=========================================
PROJECT SUMMARY:
${brain.summary}

=========================================
PROJECT CHEATSHEETS & FACTS (NOTES/SNIPPETS/LINKS):
${brain.knowledgeFacts}

=========================================
PROJECT ACTIVE TASKS:
${brain.tasksContext}

=========================================
RECENT PROJECT WORK ACTIVITY LOG:
${brain.recentActivity}

=========================================
RELEVANT RAG DOCUMENT CHUNKS:
${brain.semanticContext}

=========================================
${toolExecutionLog ? `RECENT DRAFTED ACTIONS/TOOL EXECUTION LOGS:\n${toolExecutionLog}\n=========================================` : ""}

Answer the query using the context above. If you cannot answer it or don't have information, say so.`;

  const apiMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userQuery }
  ];

  return chatCompletion(apiMessages, "openai/gpt-oss-120b");
}

export interface ControllerResult {
  response: string;
  hasPendingApproval: boolean;
  approvalId?: string;
  toolPlanned?: string;
  toolArgs?: any;
}

export async function runAgentLoop(
  workspaceId: string,
  projectId: string,
  sessionId: string,
  userMessageId: string,
  userText: string,
  userId: string,
  userEmail: string
): Promise<ControllerResult> {
  console.log(`[AgentController] Starting agent loop for session: ${sessionId}`);

  // 1. Gather Context
  const context = await gatherAgentContext(workspaceId, projectId, userId, userEmail, userText);

  // 2. Generate Plan
  const plan = await generateAgentPlan(userText, context);
  console.log(`[AgentController] Generated plan:`, plan);

  if (plan.toolCalls.length === 0) {
    // Standard Q&A mode: no tools needed
    const response = await generateContextualAnswer(userText, context);
    return { response, hasPendingApproval: false };
  }

  // 3. Process first planned tool call (agent executes step-by-step)
  const toolCall = plan.toolCalls[0];
  const permission = getToolPermission(toolCall.name);

  if (permission.requiresApproval) {
    // Create Approval request in database
    console.log(`[AgentController] Tool '${toolCall.name}' requires approval. Drafting request...`);
    const approvalId = await createApprovalRequest(
      workspaceId,
      projectId,
      sessionId,
      userMessageId,
      toolCall.name,
      permission.riskLevel,
      toolCall.arguments
    );

    const prettyArgs = JSON.stringify(toolCall.arguments, null, 2);
    const approvalMessage = `### 📋 Action Approval Required
I have drafted a plan that requires your approval to perform a write operation:

**Proposed Action:** \`${toolCall.name}\`
**Parameters:**
\`\`\`json
${prettyArgs}
\`\`\`

*Please review and select Approve or Reject below to proceed.*`;

    return {
      response: approvalMessage,
      hasPendingApproval: true,
      approvalId,
      toolPlanned: toolCall.name,
      toolArgs: toolCall.arguments
    };
  }

  // 4. Auto-execute READ tools (e.g. search_tasks, read_document)
  try {
    const output = await executeAgentTool(toolCall, workspaceId, projectId);
    const verification = await verifyToolExecution(toolCall.name, output, toolCall.arguments);
    
    const executionLog = `Tool Call: ${toolCall.name}\nArguments: ${JSON.stringify(
      toolCall.arguments
    )}\nOutput: ${JSON.stringify(output)}\nVerification Status: ${verification.verified ? "VERIFIED" : "UNVERIFIED"} (${verification.message})`;

    // Generate final answer summarizing the tool outputs
    const response = await generateContextualAnswer(userText, context, executionLog);
    return { response, hasPendingApproval: false };
  } catch (err: any) {
    console.error(`[AgentController] Auto-execution failed for tool ${toolCall.name}:`, err);
    return {
      response: `I attempted to execute the action \`${toolCall.name}\`, but encountered an error: ${err.message}`,
      hasPendingApproval: false
    };
  }
}
