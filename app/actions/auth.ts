"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to get user." };
  }
}
