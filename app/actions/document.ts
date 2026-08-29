"use server";

import { revalidatePath } from "next/cache";
import * as documentService from "@/lib/services/document";

export async function getDocumentsAction(workspaceId: string, projectId?: string) {
  try {
    const list = await documentService.getDocuments(workspaceId, projectId);
    return { success: true, documents: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch documents." };
  }
}

export async function uploadDocumentAction(formData: FormData) {
  try {
    const workspaceId = formData.get("workspaceId") as string;
    const projectId = formData.get("projectId") as string;
    const file = formData.get("file") as File;

    if (!workspaceId || !projectId || !file) {
      return { success: false, error: "Missing required parameters." };
    }

    const doc = await documentService.uploadDocument(workspaceId, projectId, file);
    if (doc) {
      revalidatePath("/knowledge");
      return { success: true, document: doc };
    }
    return { success: false, error: "Failed to upload and process document." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred during upload." };
  }
}

export async function deleteDocumentAction(docId: string) {
  try {
    const success = await documentService.deleteDocument(docId);
    if (success) {
      revalidatePath("/knowledge");
      return { success: true };
    }
    return { success: false, error: "Failed to delete document." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}
