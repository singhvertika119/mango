"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Offline mock state
let mockConnected = false;

export async function getIntegrationsAction(workspaceId: string) {
  const isPlaceholder = !process.env.GITHUB_CLIENT_ID || 
                        process.env.GITHUB_CLIENT_ID === "your_github_client_id";

  if (!isSupabaseConfigured) {
    return { success: true, connected: mockConnected, isPlaceholder: true };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integrations")
      .select("id, provider, settings")
      .eq("workspace_id", workspaceId)
      .eq("provider", "github")
      .maybeSingle();

    if (error) throw error;
    return { success: true, connected: !!data, integration: data, isPlaceholder };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch integrations." };
  }
}

export async function disconnectGithubAction(workspaceId: string) {
  if (!isSupabaseConfigured) {
    mockConnected = false;
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider", "github");

    if (error) throw error;
    revalidatePath("/integrations");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to disconnect GitHub." };
  }
}

export async function mockConnectGithubAction() {
  mockConnected = true;
  return { success: true };
}
