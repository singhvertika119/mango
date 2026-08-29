import { createClient } from "@/lib/supabase/server";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export type LogLevel = "info" | "warn" | "error";

interface LogParams {
  level: LogLevel;
  component: "rag" | "groq" | "auth" | "oauth" | "mcp" | "agent" | "general";
  message: string;
  workspaceId?: string;
  metadata?: any;
}

// Temporary in-memory logs for offline fallback
export let mockSystemLogs: any[] = [
  {
    id: "mock-log-1",
    workspace_id: "mango-default-ws",
    level: "info",
    component: "mcp",
    message: "Workspace MCP server connection established successfully.",
    metadata: { transport: "sse" },
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: "mock-log-2",
    workspace_id: "mango-default-ws",
    level: "warn",
    component: "groq",
    message: "Groq API token limit warnings: usage near 75% of free tier threshold.",
    metadata: { tokens_used: 1245 },
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  }
];

async function writeLog(params: LogParams) {
  const timestamp = new Date().toISOString();
  console.log(`[${params.level.toUpperCase()}] [${params.component}] ${params.message}`);

  if (!isSupabaseConfigured) {
    mockSystemLogs.unshift({
      id: `mock-log-${Date.now()}`,
      workspace_id: params.workspaceId || "mango-default-ws",
      level: params.level,
      component: params.component,
      message: params.message,
      metadata: params.metadata || {},
      created_at: timestamp
    });
    return;
  }

  try {
    const supabase = await createClient();
    await supabase.from("system_logs").insert({
      workspace_id: params.workspaceId || null,
      level: params.level,
      component: params.component,
      message: params.message,
      metadata: params.metadata || {}
    });
  } catch (err) {
    console.error("logger writeLog failed to save to database:", err);
  }
}

export const logger = {
  info: (component: LogParams["component"], message: string, workspaceId?: string, metadata?: any) =>
    writeLog({ level: "info", component, message, workspaceId, metadata }),
  
  warn: (component: LogParams["component"], message: string, workspaceId?: string, metadata?: any) =>
    writeLog({ level: "warn", component, message, workspaceId, metadata }),

  error: (component: LogParams["component"], message: string, workspaceId?: string, metadata?: any) =>
    writeLog({ level: "error", component, message, workspaceId, metadata })
};
