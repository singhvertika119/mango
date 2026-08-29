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

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Global mock memory for documents in offline mode
let mockDocuments: Document[] = [
  {
    id: "mock-doc-1",
    workspace_id: "mango-default-ws",
    project_id: "mango-default-proj",
    file_id: "mock-file-1",
    title: "Mango_PRD.md",
    type: "md",
    status: "completed",
    created_at: new Date().toISOString()
  }
];

export async function getDocuments(workspaceId: string, projectId?: string): Promise<Document[]> {
  if (!isSupabaseConfigured) {
    let list = mockDocuments.filter((d) => d.workspace_id === workspaceId);
    if (projectId) list = list.filter((d) => d.project_id === projectId);
    return list;
  }

  const supabase = await createClient();
  let query = supabase.from("documents").select("*").eq("workspace_id", workspaceId);
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
  return data || [];
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

  if (!isSupabaseConfigured) {
    const doc: Document = {
      id: `mock-doc-${Date.now()}`,
      workspace_id: workspaceId,
      project_id: projectId,
      file_id: `mock-file-${Date.now()}`,
      title: fileName,
      type: extension,
      status: "completed",
      created_at: new Date().toISOString()
    };
    mockDocuments.push(doc);
    return doc;
  }

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
    console.error("Storage upload failed:", uploadError);
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
    console.error("Files table insertion failed:", fileError);
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
      status: "pending",
      created_by: user.id
    })
    .select()
    .single();

  if (docError) {
    console.error("Documents table insertion failed:", docError);
    return null;
  }

  // 4. Trigger the Supabase Edge Function to process in the background
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ documentId: docRecord.id })
    }).catch((err) => console.error("Async edge function trigger warning:", err));
  } catch (triggerError) {
    console.error("Failed to trigger edge function:", triggerError);
  }

  return docRecord;
}

export async function deleteDocument(docId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const index = mockDocuments.findIndex((d) => d.id === docId);
    if (index !== -1) {
      mockDocuments.splice(index, 1);
      return true;
    }
    return false;
  }

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
}
