import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
  metadata: any;
}

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Offline mock search chunks
const mockChunks = [
  {
    id: "mock-chunk-1",
    document_id: "mock-doc-1",
    content: "The encryption key is stored under ENCRYPTION_KEY inside your .env.local file. All credentials are encrypted using AES-256-GCM.",
    similarity: 0.92,
    metadata: { title: "security_spec.md" }
  },
  {
    id: "mock-chunk-2",
    document_id: "mock-doc-1",
    content: "Supabase edge functions process files from storage and generate 384 dimensional vectors using the gte-small model.",
    similarity: 0.88,
    metadata: { title: "architecture_spec.md" }
  }
];

export async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  if (!isSupabaseConfigured) {
    return Array.from({ length: 384 }, () => Math.random());
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error("Embedding call failed");
    const data = await res.json();
    return data.embedding;
  } catch (err) {
    console.error("Failed to generate query embedding:", err);
    return null;
  }
}

export async function searchChunks(
  workspaceId: string,
  projectId: string | null,
  queryText: string,
  matchCount = 5,
  matchThreshold = 0.5
): Promise<SearchResult[]> {
  if (!isSupabaseConfigured) {
    return mockChunks;
  }

  const embedding = await generateQueryEmbedding(queryText);
  if (!embedding) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_workspace_id: workspaceId,
    filter_project_id: projectId || null
  });

  if (error) {
    console.error("RPC match_document_chunks failed:", error);
    return [];
  }

  return data as SearchResult[];
}
