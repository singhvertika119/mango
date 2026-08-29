import { createClient } from "@/lib/supabase/server";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Offline mock database arrays
export interface ApprovalRecord {
  id: string;
  workspace_id: string;
  project_id: string;
  user_id: string;
  agent_session_id: string;
  agent_action_id: string;
  tool_name: string;
  action_type: "read" | "write" | "dangerous";
  parameters: any;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "EXECUTED" | "FAILED";
  created_at: string;
}

export let mockApprovals: ApprovalRecord[] = [];

export async function createApprovalRequest(
  workspaceId: string,
  projectId: string,
  sessionId: string,
  messageId: string,
  toolName: string,
  riskLevel: "READ" | "WRITE" | "DANGEROUS",
  parameters: any
): Promise<string> {
  const approvalId = crypto.randomUUID();
  const actionId = crypto.randomUUID();
  const actionType = riskLevel.toLowerCase() as "read" | "write" | "dangerous";

  if (!isSupabaseConfigured) {
    const record: ApprovalRecord = {
      id: approvalId,
      workspace_id: workspaceId,
      project_id: projectId,
      user_id: "mock-user-id",
      agent_session_id: sessionId,
      agent_action_id: actionId,
      tool_name: toolName,
      action_type: actionType,
      parameters,
      status: "PENDING",
      created_at: new Date().toISOString()
    };
    mockApprovals.push(record);
    return approvalId;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Insert into agent_actions
  const { error: actionErr } = await supabase
    .from("agent_actions")
    .insert({
      id: actionId,
      session_id: sessionId,
      message_id: messageId,
      tool_name: toolName,
      parameters: parameters,
      status: "pending"
    });

  if (actionErr) throw actionErr;

  // 2. Insert into approvals
  const { error: approvalErr } = await supabase
    .from("approvals")
    .insert({
      id: approvalId,
      workspace_id: workspaceId,
      project_id: projectId,
      user_id: user.id,
      agent_session_id: sessionId,
      agent_action_id: actionId,
      tool_name: toolName,
      action_type: actionType,
      parameters: parameters,
      status: "PENDING"
    });

  if (approvalErr) throw approvalErr;

  // 3. Create user notification
  try {
    const { createNotificationHelper } = await import("@/app/actions/notifications");
    await createNotificationHelper(
      workspaceId,
      user.id,
      "Agent Action Pending",
      `The agent is requesting approval to execute tool: ${toolName}.`,
      "approval",
      `/agent?workspaceId=${workspaceId}`
    );
  } catch (err) {
    console.error("Failed to generate approval notification:", err);
  }

  return approvalId;
}
