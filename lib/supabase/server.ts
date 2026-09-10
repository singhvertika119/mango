import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    signal: init?.signal || AbortSignal.timeout(1000),
  }).catch((err) => {
    if (
      err.name === "AbortError" ||
      err.name === "TimeoutError" ||
      err.message?.includes("aborted")
    ) {
      return new Response(
        JSON.stringify({
          message: "Request timed out",
          code: "408",
          error: "request_timeout",
        }),
        {
          status: 408,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    throw err;
  });
};

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    {
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
      global: {
        fetch: customFetch,
      },
    }
  );
}
