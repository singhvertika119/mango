import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

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

export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
      {
        global: { fetch: customFetch },
      }
    );
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
      {
        global: { fetch: customFetch },
      }
    );
  }
  return client;
}
