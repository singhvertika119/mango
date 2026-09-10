import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getCleanSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ndnnbohgwuhnqmnnxtre.supabase.co";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = getCleanSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}

