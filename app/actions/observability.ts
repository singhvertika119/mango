"use server";

import { createClient } from "@/lib/supabase/server";
import { mockSystemLogs } from "@/lib/utils/logger";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getSystemLogsAction(workspaceId: string) {
  if (!isSupabaseConfigured) {
    return { success: true, logs: mockSystemLogs };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { success: true, logs: data || [] };
  } catch (err: any) {
    console.error("Failed to fetch system logs:", err);
    return { success: false, error: err.message || "Failed to load system diagnostics." };
  }
}
