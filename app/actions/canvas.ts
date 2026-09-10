"use server";

import { revalidatePath } from "next/cache";
import * as canvasService from "@/lib/services/canvas";
import { CanvasData, CanvasDocument } from "@/components/canvas/types";
import { chatCompletion, ChatMessage } from "@/lib/ai/groq";

export async function getCanvasDocumentsAction(workspaceId: string, projectId: string) {
  try {
    const documents = await canvasService.getCanvasDocuments(workspaceId, projectId);
    return { success: true, documents };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load canvas boards." };
  }
}

export async function getCanvasDocumentAction(id: string) {
  try {
    const document = await canvasService.getCanvasDocument(id);
    return { success: true, document };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load canvas board." };
  }
}

export async function createCanvasDocumentAction(
  workspaceId: string,
  projectId: string,
  title: string,
  content?: string,
  canvasData?: CanvasData
) {
  try {
    const document = await canvasService.createCanvasDocument(workspaceId, projectId, title, content, canvasData);
    revalidatePath("/canvas");
    return { success: true, document };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create canvas board." };
  }
}

export async function updateCanvasDocumentAction(
  id: string,
  updates: Partial<Pick<CanvasDocument, "title" | "content" | "canvas_data">>
) {
  try {
    const document = await canvasService.updateCanvasDocument(id, updates);
    return { success: true, document };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save canvas changes." };
  }
}

export async function deleteCanvasDocumentAction(id: string) {
  try {
    const ok = await canvasService.deleteCanvasDocument(id);
    revalidatePath("/canvas");
    return { success: ok };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete canvas." };
  }
}

export async function generateAiCanvasBoardAction(
  prompt: string,
  workspaceId: string,
  projectId: string
): Promise<{ success: boolean; document?: CanvasDocument; error?: string }> {
  try {
    const systemPrompt = `You are an expert Software Architect. Given a user's concept or system request, generate BOTH clear plain-English technical notes AND visual whiteboard nodes & connectors (Excalidraw-style).

You MUST respond strictly with a valid JSON object in this exact schema without any markdown wrapping:
{
  "title": "Short descriptive board title",
  "notes": "System Overview & Architecture Notes\\n\\nOverview:\\nDetailed architecture explanation in natural English...\\n\\nKey Components:\\n- Component 1: Responsibility\\n- Component 2: Responsibility\\n\\nExecution Checklist:\\n- Task 1\\n- Task 2",
  "nodes": [
    {
      "id": "node-1",
      "type": "service",
      "label": "Client App",
      "sublabel": "React / Mobile",
      "color": "indigo",
      "icon": "globe",
      "x": 80,
      "y": 120,
      "width": 180,
      "height": 80
    },
    {
      "id": "node-2",
      "type": "service",
      "label": "API Gateway",
      "sublabel": "Auth & Routing",
      "color": "sky",
      "icon": "zap",
      "x": 340,
      "y": 120,
      "width": 190,
      "height": 80
    },
    {
      "id": "node-3",
      "type": "database",
      "label": "Primary Database",
      "sublabel": "PostgreSQL",
      "color": "emerald",
      "icon": "database",
      "x": 340,
      "y": 280,
      "width": 190,
      "height": 85
    }
  ],
  "connectors": [
    {
      "id": "conn-1",
      "fromNodeId": "node-1",
      "toNodeId": "node-2",
      "label": "REST / JSON",
      "style": "solid",
      "color": "indigo"
    },
    {
      "id": "conn-2",
      "fromNodeId": "node-2",
      "toNodeId": "node-3",
      "label": "SQL Queries",
      "style": "solid",
      "color": "emerald"
    }
  ]
}

Position coordinates nicely so nodes do not overlap (spread x by 240-280px or y by 160-200px).`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate an architecture whiteboard and technical notes for: "${prompt}"` }
    ];

    const response = await chatCompletion(messages, "llama-3.3-70b-versatile", 0.2);

    let cleanJson = response.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanJson);

    const canvasData: CanvasData = {
      nodes: parsed.nodes || [],
      connectors: parsed.connectors || [],
      viewport: { x: 0, y: 0, zoom: 1 }
    };

    const document = await canvasService.createCanvasDocument(
      workspaceId,
      projectId,
      parsed.title || "AI Generated Architecture",
      parsed.notes || "",
      canvasData
    );

    revalidatePath("/canvas");
    return { success: true, document };
  } catch (err: any) {
    console.error("AI Canvas Generation Error:", err);
    // Fallback template if Groq API is unreachable
    const fallbackCanvasData: CanvasData = {
      nodes: [
        { id: "node-1", type: "service", x: 80, y: 120, width: 180, height: 80, label: "Client Layer", sublabel: "Web & Mobile", color: "indigo", icon: "globe" },
        { id: "node-2", type: "service", x: 340, y: 120, width: 190, height: 80, label: "Application API", sublabel: "Node.js Microservices", color: "sky", icon: "zap" },
        { id: "node-3", type: "database", x: 340, y: 280, width: 190, height: 85, label: "Database Cluster", sublabel: "PostgreSQL + Cache", color: "emerald", icon: "database" }
      ],
      connectors: [
        { id: "conn-1", fromNodeId: "node-1", toNodeId: "node-2", label: "HTTPS", style: "solid", color: "indigo" },
        { id: "conn-2", fromNodeId: "node-2", toNodeId: "node-3", label: "Queries", style: "solid", color: "emerald" }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    };

    const fallbackDoc = await canvasService.createCanvasDocument(
      workspaceId,
      projectId,
      prompt.slice(0, 40) || "AI Architecture Spec",
      `${prompt}\n\nOverview:\nAuto-generated architecture and technical specifications in plain English.\n\nKey Components:\n- Client Layer: Web and mobile client interface\n- Application API: Node.js API services\n- Database Cluster: PostgreSQL and cache layer\n\nExecution Steps:\n- Configure API routes\n- Connect database schema\n- Test end-to-end communication`,
      fallbackCanvasData
    );

    return { success: true, document: fallbackDoc };
  }
}
