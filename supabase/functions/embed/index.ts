import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

declare const Supabase: {
  ai: {
    Session: new (model: string) => {
      run: (
        text: string | string[],
        options: { mean_pool: boolean; normalize: boolean }
      ) => Promise<number[] | number[][]>;
    };
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid text parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate embedding using the local gte-small session
    const session = new Supabase.ai.Session("gte-small");
    const embedding = await session.run(text.trim(), { mean_pool: true, normalize: true });

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Embedding generation failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
