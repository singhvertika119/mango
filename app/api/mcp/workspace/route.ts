import { NextRequest, NextResponse } from "next/server";
import * as tools from "@/lib/mcp/tools";

// Store active client streams
type SSEController = ReadableStreamDefaultController;
const clients = new Map<string, SSEController>();

// GET starts the SSE stream connection
export async function GET(req: NextRequest) {
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      clients.set(clientId, controller);
      
      // Immediately notify client of the POST message target endpoint
      const endpointMsg = `event: endpoint\ndata: /api/mcp/workspace?clientId=${clientId}\n\n`;
      controller.enqueue(new TextEncoder().encode(endpointMsg));
    },
    cancel() {
      clients.delete(clientId);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}

// POST processes incoming JSON-RPC 2.0 messages from the client
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId || !clients.has(clientId)) {
    return NextResponse.json({ error: "Invalid or expired clientId" }, { status: 400 });
  }

  const controller = clients.get(clientId);
  if (!controller) {
    return NextResponse.json({ error: "Client disconnected" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jsonrpc, id, method, params } = body;
  if (jsonrpc !== "2.0" || !id || !method) {
    return NextResponse.json({ error: "Invalid JSON-RPC format" }, { status: 400 });
  }

  let result;
  let error;

  try {
    if (method === "tools/list") {
      result = {
        tools: [
          {
            name: "search_projects",
            description: "List projects inside the active workspace, optionally filtering by search queries.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string", description: "The unique UUID of the workspace." },
                query: { type: "string", description: "Optional project search filter query." }
              },
              required: ["workspaceId"]
            }
          },
          {
            name: "get_project",
            description: "Retrieve comprehensive details and status metrics for a specific project.",
            inputSchema: {
              type: "object",
              properties: {
                projectId: { type: "string", description: "The unique UUID of the project." }
              },
              required: ["projectId"]
            }
          },
          {
            name: "search_tasks",
            description: "Search workspace and project tasks, optionally filtering by query or status.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                projectId: { type: "string" },
                query: { type: "string" },
                status: { type: "string", enum: ["Todo", "In Progress", "Review", "Completed", "Blocked"] }
              },
              required: ["workspaceId"]
            }
          },
          {
            name: "create_task",
            description: "Create a new workspace task under the specified project scope.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                projectId: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                status: { type: "string", enum: ["Todo", "In Progress", "Review", "Completed", "Blocked"] },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }
              },
              required: ["workspaceId", "projectId", "title"]
            }
          },
          {
            name: "update_task",
            description: "Update task fields (status, priority, details) by task UUID.",
            inputSchema: {
              type: "object",
              properties: {
                taskId: { type: "string" },
                updates: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    status: { type: "string", enum: ["Todo", "In Progress", "Review", "Completed", "Blocked"] },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }
                  }
                }
              },
              required: ["taskId", "updates"]
            }
          },
          {
            name: "search_documents",
            description: "Search uploaded project specification files and blueprints.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                projectId: { type: "string" },
                query: { type: "string" }
              },
              required: ["workspaceId", "projectId"]
            }
          },
          {
            name: "read_document",
            description: "Read full parsed content text chunks of a selected document file.",
            inputSchema: {
              type: "object",
              properties: {
                documentId: { type: "string" }
              },
              required: ["documentId"]
            }
          },
          {
            name: "search_notes",
            description: "Retrieve project markdown notes and facts.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                projectId: { type: "string" },
                query: { type: "string" }
              },
              required: ["workspaceId", "projectId"]
            }
          },
          {
            name: "search_code_snippets",
            description: "Search project code snippets with syntax specifications.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                projectId: { type: "string" },
                query: { type: "string" }
              },
              required: ["workspaceId", "projectId"]
            }
          },
          {
            name: "get_project_activity",
            description: "Fetch recent logs tracking user changes and workspace events.",
            inputSchema: {
              type: "object",
              properties: {
                projectId: { type: "string" }
              },
              required: ["projectId"]
            }
          }
        ]
      };
    } else if (method === "tools/call") {
      const { name, arguments: args } = params;
      let output;

      switch (name) {
        case "search_projects":
          output = await tools.searchProjects(args.workspaceId, args.query);
          break;
        case "get_project":
          output = await tools.getProject(args.projectId);
          break;
        case "search_tasks":
          output = await tools.searchTasks(args.workspaceId, args.projectId, args.query, args.status);
          break;
        case "create_task":
          output = await tools.createWorkspaceTask(args.workspaceId, args.projectId, args.title, args.description, args.status, args.priority);
          break;
        case "update_task":
          output = await tools.updateWorkspaceTask(args.taskId, args.updates);
          break;
        case "search_documents":
          output = await tools.searchDocuments(args.workspaceId, args.projectId, args.query);
          break;
        case "read_document":
          output = await tools.readDocument(args.documentId);
          break;
        case "search_notes":
          output = await tools.searchNotes(args.workspaceId, args.projectId, args.query);
          break;
        case "search_code_snippets":
          output = await tools.searchCodeSnippets(args.workspaceId, args.projectId, args.query);
          break;
        case "get_project_activity":
          output = await tools.getProjectActivity(args.projectId);
          break;
        default:
          throw new Error(`Tool ${name} not found on this server.`);
      }

      result = {
        content: [
          {
            type: "text",
            text: typeof output === "string" ? output : JSON.stringify(output, null, 2)
          }
        ]
      };
    } else {
      throw new Error(`Method ${method} is not supported.`);
    }
  } catch (err: any) {
    error = {
      code: -32603,
      message: err.message || "Internal server error execution tool."
    };
  }

  // Push JSON-RPC response back to the client's GET connection SSE stream
  const responsePayload = JSON.stringify({
    jsonrpc: "2.0",
    id,
    ...(error ? { error } : { result })
  });

  const sseMsg = `event: message\ndata: ${responsePayload}\n\n`;
  controller.enqueue(new TextEncoder().encode(sseMsg));

  return new Response("Accepted", { status: 202 });
}
