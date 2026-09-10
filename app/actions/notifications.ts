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

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Offline mock state
let mockNotifications: Notification[] = [
  {
    id: "mock-notif-1",
    workspace_id: "mango-default-ws",
    user_id: "mock-user-id",
    title: "Project Initialized",
    message: "Workspace Agent project was successfully synced with local repositories.",
    type: "success",
    is_read: false,
    link: "/dashboard",
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: "mock-notif-2",
    workspace_id: "mango-default-ws",
    user_id: "mock-user-id",
    title: "Action Pending Approval",
    message: "Agent requested permission to create_task for RLS audit.",
    type: "approval",
    is_read: false,
    link: "/agent",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

export async function getNotificationsAction(workspaceId: string) {
  if (!isSupabaseConfigured) {
    return { success: true, notifications: mockNotifications };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return { success: true, notifications: data as Notification[] };
  } catch (err: any) {
    return { success: true, notifications: mockNotifications };
  }
}

export async function markNotificationAsReadAction(notificationId: string) {
  if (!isSupabaseConfigured) {
    const notif = mockNotifications.find(n => n.id === notificationId);
    if (notif) {
      notif.is_read = true;
    }
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update notification status." };
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
  if (!isSupabaseConfigured) {
    const notif: Notification = {
      id: `mock-notif-${Date.now()}`,
      workspace_id: workspaceId,
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      link,
      created_at: new Date().toISOString()
    };
    mockNotifications.unshift(notif);
    return;
  }

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
  } catch (err) {
    console.error("createNotificationHelper failed:", err);
  }
}
