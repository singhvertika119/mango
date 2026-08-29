"use server";

import * as ragService from "@/lib/services/rag";

export async function searchChunksAction(
  workspaceId: string,
  projectId: string | null,
  queryText: string,
  matchCount = 5,
  matchThreshold = 0.5
) {
  try {
    const results = await ragService.searchChunks(
      workspaceId,
      projectId,
      queryText,
      matchCount,
      matchThreshold
    );
    return { success: true, results };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to search RAG index." };
  }
}
