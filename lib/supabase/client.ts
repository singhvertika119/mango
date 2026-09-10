import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

function getCleanSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    signal: init?.signal || AbortSignal.timeout(3000),
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
  const url = getCleanSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  if (typeof window === "undefined") {
    return createBrowserClient(url, anonKey, {
      global: { fetch: customFetch },
    });
  }

  if (!client) {
    client = createBrowserClient(url, anonKey, {
      global: { fetch: customFetch },
    });
  }
  return client;
}
