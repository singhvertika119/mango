"use server";

import { cookies } from "next/headers";

export async function demoLoginAction(fullName?: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set("sb-demo-auth-token", "demo-session-token", {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    if (fullName) {
      cookieStore.set("mango-user-name", encodeURIComponent(fullName), {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to start demo session." };
  }
}
