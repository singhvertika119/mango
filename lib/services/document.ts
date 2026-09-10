import { createClient } from "@/lib/supabase/server";

export interface Document {
  id: string;
  workspace_id: string;
  project_id: string;
  file_id: string | null;
  title: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export async function getDocuments(workspaceId: string, projectId?: string): Promise<Document[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("documents").select("*").eq("workspace_id", workspaceId);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching documents:", error.message);
      return [];
    }
    return (data as Document[]) || [];
  } catch (err: any) {
    console.error("getDocuments error:", err?.message);
    return [];
  }
}

export async function uploadDocument(
  workspaceId: string,
  projectId: string,
  file: File
): Promise<Document | null> {
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;
  const extension = fileName.split(".").pop() || "txt";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Upload to Supabase Storage
    const fileId = crypto.randomUUID();
    const filePath = `workspace/${workspaceId}/project/${projectId}/${fileId}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: "3600"
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError.message);
      return null;
    }

    // 2. Insert into files table
    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .insert({
        id: fileId,
        workspace_id: workspaceId,
        project_id: projectId,
        name: fileName,
        file_path: filePath,
        size_bytes: fileSize,
        mime_type: mimeType,
        created_by: user.id
      })
      .select()
      .single();

    if (fileError) {
      console.error("Files table insertion failed:", fileError.message);
      return null;
    }

    // 3. Insert into documents table
    const { data: docRecord, error: docError } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        file_id: fileRecord.id,
        title: fileName,
        type: extension,
        status: "completed",
        created_by: user.id
      })
      .select()
      .single();

    if (docError) {
      console.error("Documents table insertion failed:", docError.message);
      return null;
    }

    return docRecord as Document;
  } catch (err: any) {
    console.error("uploadDocument error:", err?.message);
    return null;
  }
}

export async function deleteDocument(docId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("*, files(*)")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) return false;

    // Delete from storage and files table
    if (doc.files) {
      await supabase.storage.from("project-files").remove([doc.files.file_path]);
      await supabase.from("files").delete().eq("id", doc.files.id);
    }

    // Delete document
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    return !error;
  } catch (err: any) {
    console.error("deleteDocument error:", err?.message);
    return false;
  }
}
