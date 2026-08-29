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

export async function sendAgentMessageAction(
  workspaceId: string,
  projectId: string,
  sessionId: string,
  userText: string
) {
  if (!userText.trim()) return { success: false, error: "Empty message." };

  try {
    // 1. Gather Project Brain Context
    const brain = await compileProjectBrainContext(workspaceId, projectId, userText);

    // 2. Build the LLM System Prompt
    const systemPrompt = `You are a helpful, context-aware Workspace Agent. You have access to the user's project data, tasks, activity logs, and vector-search document chunks. Answer the user's query clearly and accurately using the context below. If you do not know the answer, say so. Do not make up facts.

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
=========================================`;

    if (!isSupabaseConfigured) {
      // Mock Response Generation
      const userMsg: AgentMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: userText,
        created_at: new Date().toISOString()
      };
      
      const assistantResponse = await chatCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ]);

      const assistantMsg: AgentMessage = {
        id: `msg-asst-${Date.now()}`,
        role: "assistant",
        content: assistantResponse,
        created_at: new Date().toISOString()
      };

      if (!mockMessages[sessionId]) mockMessages[sessionId] = [];
      mockMessages[sessionId].push(userMsg, assistantMsg);

      return { success: true, messages: [userMsg, assistantMsg] };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 3. Save User Message to Database
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

    // 4. Fetch Chat History (limit to last 15 messages to keep payload light)
    const { data: history, error: historyErr } = await supabase
      .from("agent_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(15);

    if (historyErr) throw historyErr;

    // 5. Structure API payload
    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...(history?.map(h => ({
        role: h.role as "user" | "assistant" | "system",
        content: h.content
      })) || [])
    ];

    // 6. Call Groq
    const assistantContent = await chatCompletion(apiMessages);

    // 7. Save Assistant Message to Database
    const { data: assistantMsg, error: asstMsgErr } = await supabase
      .from("agent_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: assistantContent
      })
      .select()
      .single();

    if (asstMsgErr) throw asstMsgErr;

    revalidatePath("/agent");
    return { success: true, messages: [userMsg, assistantMsg] };
  } catch (err: any) {
    console.error("sendAgentMessageAction failed:", err);
    return { success: false, error: err.message || "Failed to process chat message." };
  }
}
