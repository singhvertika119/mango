"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "approval";
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export async function getNotificationsAction(workspaceId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: true, notifications: [] };

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error.message);
      return { success: true, notifications: [] };
    }
    return { success: true, notifications: (data as Notification[]) || [] };
  } catch (err: any) {
    console.error("getNotificationsAction error:", err?.message);
    return { success: true, notifications: [] };
  }
}

export async function markNotificationAsReadAction(notificationId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update notification status." };
  }
}

export async function createNotificationHelper(
  workspaceId: string,
  userId: string,
  title: string,
  message: string,
  type: Notification["type"] = "info",
  link: string | null = null
) {
  try {
    const supabase = await createClient();
    await supabase
      .from("notifications")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        title,
        message,
        type,
        link
      });
  } catch (err: any) {
    console.error("createNotificationHelper failed:", err?.message);
  }
}
