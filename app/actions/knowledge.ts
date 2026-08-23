"use server";

import { revalidatePath } from "next/cache";
import * as knowledgeService from "@/lib/services/knowledge";

// Notes Actions
export async function getNotesAction(workspaceId: string, projectId?: string) {
  try {
    const list = await knowledgeService.getNotes(workspaceId, projectId);
    return { success: true, notes: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch notes." };
  }
}

export async function createNoteAction(
  workspaceId: string,
  projectId: string,
  title: string,
  content: string | null
) {
  try {
    const note = await knowledgeService.createNote(workspaceId, projectId, title, content);
    if (note) {
      revalidatePath("/knowledge");
      return { success: true, note };
    }
    return { success: false, error: "Failed to create note." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function deleteNoteAction(noteId: string) {
  try {
    const success = await knowledgeService.deleteNote(noteId);
    if (success) {
      revalidatePath("/knowledge");
      return { success: true };
    }
    return { success: false, error: "Failed to delete note." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

// Links Actions
export async function getLinksAction(workspaceId: string, projectId?: string) {
  try {
    const list = await knowledgeService.getLinks(workspaceId, projectId);
    return { success: true, links: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch links." };
  }
}

export async function createLinkAction(
  workspaceId: string,
  projectId: string,
  title: string,
  url: string,
  description: string | null
) {
  try {
    const link = await knowledgeService.createLink(workspaceId, projectId, title, url, description);
    if (link) {
      revalidatePath("/knowledge");
      return { success: true, link };
    }
    return { success: false, error: "Failed to create link." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function deleteLinkAction(linkId: string) {
  try {
    const success = await knowledgeService.deleteLink(linkId);
    if (success) {
      revalidatePath("/knowledge");
      return { success: true };
    }
    return { success: false, error: "Failed to delete link." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

// Snippets Actions
export async function getCodeSnippetsAction(workspaceId: string, projectId?: string) {
  try {
    const list = await knowledgeService.getCodeSnippets(workspaceId, projectId);
    return { success: true, snippets: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch snippets." };
  }
}

export async function createCodeSnippetAction(
  workspaceId: string,
  projectId: string,
  title: string,
  description: string | null,
  code: string,
  language: string
) {
  try {
    const snippet = await knowledgeService.createCodeSnippet(
      workspaceId,
      projectId,
      title,
      description,
      code,
      language
    );
    if (snippet) {
      revalidatePath("/knowledge");
      return { success: true, snippet };
    }
    return { success: false, error: "Failed to create snippet." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function deleteCodeSnippetAction(snippetId: string) {
  try {
    const success = await knowledgeService.deleteCodeSnippet(snippetId);
    if (success) {
      revalidatePath("/knowledge");
      return { success: true };
    }
    return { success: false, error: "Failed to delete snippet." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}
