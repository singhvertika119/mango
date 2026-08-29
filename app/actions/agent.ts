"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion, ChatMessage } from "@/lib/ai/groq";
import { compileProjectBrainContext } from "@/lib/rag/project-brain";

export interface AgentSession {
  id: string;
  title: string;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    hasPendingApproval?: boolean;
    approvalId?: string;
  };
  created_at: string;
}

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Offline mock state
let mockSessions: AgentSession[] = [
  { id: "mock-session-1", title: "General Workspace Chat", created_at: new Date().toISOString() }
];

let mockMessages: Record<string, AgentMessage[]> = {
  "mock-session-1": [
    { id: "msg-1", role: "assistant", content: "Hello! I am your Workspace Agent. I have access to your tasks, documents, and code snippets. How can I help you today?", created_at: new Date().toISOString() }
  ]
};

// ==========================================
// 1. Session Actions
// ==========================================
export async function getAgentSessionsAction(workspaceId: string, projectId: string) {
  if (!isSupabaseConfigured) {
    return { success: true, sessions: mockSessions };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_sessions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, sessions: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch chat sessions." };
  }
}

export async function createAgentSessionAction(workspaceId: string, projectId: string, title: string) {
  if (!isSupabaseConfigured) {
    const newSession: AgentSession = {
      id: `mock-session-${Date.now()}`,
      title,
      created_at: new Date().toISOString()
    };
    mockSessions.push(newSession);
    mockMessages[newSession.id] = [
      { id: `msg-${Date.now()}`, role: "assistant", content: `Session "${title}" started. How can I assist you in this project?`, created_at: new Date().toISOString() }
    ];
    return { success: true, session: newSession };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
      .from("agent_sessions")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, session: data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create chat session." };
  }
}

// ==========================================
// 2. Message Actions
// ==========================================
export async function getAgentMessagesAction(sessionId: string) {
  if (!isSupabaseConfigured) {
    return { success: true, messages: mockMessages[sessionId] || [] };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, messages: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch messages." };
  }
}

import { runAgentLoop } from "@/lib/agent/controller";
import { executeAgentTool } from "@/lib/agent/executor";
import { verifyToolExecution } from "@/lib/agent/verifier";
import { mockApprovals } from "@/lib/agent/approvals";

export async function sendAgentMessageAction(
  workspaceId: string,
  projectId: string,
  sessionId: string,
  userText: string
) {
  if (!userText.trim()) return { success: false, error: "Empty message." };

  try {
    if (!isSupabaseConfigured) {
      // Mock Agent execution loop
      const tempUserMsg: AgentMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: userText,
        created_at: new Date().toISOString()
      };
      
      const controllerResult = await runAgentLoop(
        workspaceId,
        projectId,
        sessionId,
        tempUserMsg.id,
        userText,
        "mock-user-id",
        "mock-user@mango.com"
      );

      const assistantMsg: AgentMessage = {
        id: `msg-asst-${Date.now()}`,
        role: "assistant",
        content: controllerResult.response,
        created_at: new Date().toISOString()
      };

      if (!mockMessages[sessionId]) mockMessages[sessionId] = [];
      mockMessages[sessionId].push(tempUserMsg, assistantMsg);

      return { success: true, messages: [tempUserMsg, assistantMsg] };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Save User Message to Database
    const { data: userMsg, error: userMsgErr } = await supabase
      .from("agent_messages")
      .insert({
        session_id: sessionId,
        role: "user",
        content: userText
      })
      .select()
      .single();

    if (userMsgErr) throw userMsgErr;

    // 2. Call the Agent Controller loop
    const controllerResult = await runAgentLoop(
      workspaceId,
      projectId,
      sessionId,
      userMsg.id,
      userText,
      user.id,
      user.email || ""
    );

    // 3. Save Assistant Message to Database
    const { data: assistantMsg, error: asstMsgErr } = await supabase
      .from("agent_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: controllerResult.response,
        metadata: {
          hasPendingApproval: controllerResult.hasPendingApproval,
          approvalId: controllerResult.approvalId
        }
      })
      .select()
      .single();

    if (asstMsgErr) throw asstMsgErr;

    revalidatePath("/agent");
    return { success: true, messages: [userMsg, assistantMsg] };
  } catch (err: any) {
    console.error("sendAgentMessageAction failed:", err);
    return { success: false, error: err.message || "Failed to process agent execution loop." };
  }
}

// ==========================================
// 3. Approval Resolving Action
// ==========================================
export async function resolveApprovalAction(
  approvalId: string,
  status: "APPROVED" | "REJECTED"
) {
  try {
    if (!isSupabaseConfigured) {
      const appRecord = mockApprovals.find(a => a.id === approvalId);
      if (!appRecord) throw new Error("Approval record not found.");
      appRecord.status = status;

      let assistantText = "";
      if (status === "APPROVED") {
        const toolResult = await executeAgentTool(
          { name: appRecord.tool_name, arguments: appRecord.parameters },
          appRecord.workspace_id,
          appRecord.project_id
        );
        assistantText = `✅ **Action Approved and Executed!**\n\nExecution Result Output:\n\`\`\`json\n${JSON.stringify(toolResult, null, 2)}\n\`\`\``;
        appRecord.status = "EXECUTED";
      } else {
        assistantText = `❌ **Action Rejected.** The drafted action was cancelled.`;
      }

      const asstMsg: AgentMessage = {
        id: `msg-asst-resol-${Date.now()}`,
        role: "assistant",
        content: assistantText,
        created_at: new Date().toISOString()
      };

      if (!mockMessages[appRecord.agent_session_id]) mockMessages[appRecord.agent_session_id] = [];
      mockMessages[appRecord.agent_session_id].push(asstMsg);

      return { success: true, messages: [asstMsg] };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Fetch approval details
    const { data: approval, error: fetchErr } = await supabase
      .from("approvals")
      .select("*")
      .eq("id", approvalId)
      .single();

    if (fetchErr || !approval) throw new Error("Approval request not found.");
    if (approval.status !== "PENDING") throw new Error("Approval request has already been resolved.");

    // 2. Update statuses
    const resolvedStatus = status === "APPROVED" ? "APPROVED" : "REJECTED";
    
    const { error: appUpdateErr } = await supabase
      .from("approvals")
      .update({
        status: resolvedStatus,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id
      })
      .eq("id", approvalId);

    if (appUpdateErr) throw appUpdateErr;

    const { error: actUpdateErr } = await supabase
      .from("agent_actions")
      .update({
        status: status === "APPROVED" ? "approved" : "rejected"
      })
      .eq("id", approval.agent_action_id);

    if (actUpdateErr) throw actUpdateErr;

    let responseMessageText = "";

    // 3. If approved, execute tool call and verification
    if (status === "APPROVED") {
      try {
        const output = await executeAgentTool(
          { name: approval.tool_name, arguments: approval.parameters },
          approval.workspace_id,
          approval.project_id
        );

        const verification = await verifyToolExecution(approval.tool_name, output, approval.parameters);

        // Update action status to executed
        await supabase
          .from("agent_actions")
          .update({
            status: "executed",
            result: output
          })
          .eq("id", approval.agent_action_id);

        // Update approval to EXECUTED
        await supabase
          .from("approvals")
          .update({
            status: "EXECUTED",
            result: output
          })
          .eq("id", approvalId);

        // Log to activities timeline
        await supabase
          .from("activities")
          .insert({
            workspace_id: approval.workspace_id,
            project_id: approval.project_id,
            user_id: user.id,
            action: `Approved and executed agent action: ${approval.tool_name}`,
            entity_type: "agent_action",
            entity_id: approval.agent_action_id
          });

        responseMessageText = `✅ **Action Approved and Executed!**\n\nExecution Result:\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\`\n\n*Verification status:* ${verification.verified ? "VERIFIED" : "UNVERIFIED"} (${verification.message})`;
      } catch (execErr: any) {
        await supabase
          .from("agent_actions")
          .update({
            status: "failed",
            result: { error: execErr.message }
          })
          .eq("id", approval.agent_action_id);

        await supabase
          .from("approvals")
          .update({
            status: "FAILED"
          })
          .eq("id", approvalId);

        responseMessageText = `⚠️ **Action Execution Failed:** ${execErr.message}`;
      }
    } else {
      // REJECTED
      responseMessageText = `❌ **Action Rejected.** The drafted action was cancelled by the user.`;
    }

    // 4. Save response assistant message
    const { data: assistantMsg, error: asstMsgErr } = await supabase
      .from("agent_messages")
      .insert({
        session_id: approval.agent_session_id,
        role: "assistant",
        content: responseMessageText
      })
      .select()
      .single();

    if (asstMsgErr) throw asstMsgErr;

    revalidatePath("/agent");
    return { success: true, messages: [assistantMsg] };
  } catch (err: any) {
    console.error("resolveApprovalAction failed:", err);
    return { success: false, error: err.message || "Failed to resolve approval request." };
  }
}
