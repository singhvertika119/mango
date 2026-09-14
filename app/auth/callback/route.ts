import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const baseUrl = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 1. Ensure user profile exists in public.profiles table
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const emailPrefix = user.email ? (user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1)) : "User";
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            emailPrefix;
          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null;

          await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email || "",
              full_name: fullName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString()
            },
            { onConflict: "id" }
          );
        }
      } catch (err) {
        console.warn("OAuth user profile auto-provision notice:", err);
      }

      return NextResponse.redirect(`${baseUrl}${next}`);
    } else {
      console.error("OAuth exchangeCodeForSession error:", error);
    }
  }

  // Redirect to login page with error flag if OAuth verification failed
  return NextResponse.redirect(`${baseUrl}/login?error=oauth_callback_failed`);
}

