import { NextRequest, NextResponse } from "next/server";
import * as tools from "@/lib/mcp/tools";

// Store active client streams
type SSEController = ReadableStreamDefaultController;
const clients = new Map<string, SSEController>();

// GET starts the SSE stream connection for GitHub MCP
export async function GET(req: NextRequest) {
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      clients.set(clientId, controller);
      
      // Immediately notify client of the POST message target endpoint
      const endpointMsg = `event: endpoint\ndata: /api/mcp/github?clientId=${clientId}\n\n`;
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
            name: "search_repositories",
            description: "Search public and private GitHub repositories by text queries.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                query: { type: "string" }
              },
              required: ["workspaceId", "query"]
            }
          },
          {
            name: "get_repository",
            description: "Retrieve metadata parameters about a connected repository.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" }
              },
              required: ["workspaceId", "owner", "repo"]
            }
          },
          {
            name: "search_issues",
            description: "Search issues in a repository, optionally filtering by text.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" },
                query: { type: "string" }
              },
              required: ["workspaceId", "owner", "repo"]
            }
          },
          {
            name: "get_issue",
            description: "Read details of a specific issue by number.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" },
                issueNumber: { type: "integer" }
              },
              required: ["workspaceId", "owner", "repo", "issueNumber"]
            }
          },
          {
            name: "get_pull_request",
            description: "Retrieve specifications and diffs of a pull request.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" },
                prNumber: { type: "integer" }
              },
              required: ["workspaceId", "owner", "repo", "prNumber"]
            }
          },
          {
            name: "list_pull_requests",
            description: "List open or closed pull requests in a repository.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" },
                state: { type: "string", enum: ["open", "closed", "all"] }
              },
              required: ["workspaceId", "owner", "repo"]
            }
          },
          {
            name: "get_commits",
            description: "Retrieve commit history logs of a repository.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" }
              },
              required: ["workspaceId", "owner", "repo"]
            }
          },
          {
            name: "create_issue",
            description: "Draft and submit a new issue to the target repository.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" },
                title: { type: "string" },
                body: { type: "string" }
              },
              required: ["workspaceId", "owner", "repo", "title"]
            }
          },
          {
            name: "update_issue",
            description: "Modify status, tags, or contents of an issue.",
            inputSchema: {
              type: "object",
              properties: {
                workspaceId: { type: "string" },
                owner: { type: "string" },
                repo: { type: "string" },
                issueNumber: { type: "integer" },
                updates: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    body: { type: "string" },
                    state: { type: "string", enum: ["open", "closed"] }
                  }
                }
              },
              required: ["workspaceId", "owner", "repo", "issueNumber", "updates"]
            }
          }
        ]
      };
    } else if (method === "tools/call") {
      const { name, arguments: args } = params;
      let output;

      switch (name) {
        case "search_repositories":
          output = await tools.searchRepositories(args.workspaceId, args.query);
          break;
        case "get_repository":
          output = await tools.getRepository(args.workspaceId, args.owner, args.repo);
          break;
        case "search_issues":
          output = await tools.searchIssues(args.workspaceId, args.owner, args.repo, args.query);
          break;
        case "get_issue":
          output = await tools.getIssue(args.workspaceId, args.owner, args.repo, args.issueNumber);
          break;
        case "list_pull_requests":
          output = await tools.listPullRequests(args.workspaceId, args.owner, args.repo, args.state);
          break;
        case "get_pull_request":
          output = await tools.getPullRequest(args.workspaceId, args.owner, args.repo, args.prNumber);
          break;
        case "get_commits":
          output = await tools.getCommits(args.workspaceId, args.owner, args.repo);
          break;
        case "create_issue":
          output = await tools.createIssue(args.workspaceId, args.owner, args.repo, args.title, args.body);
          break;
        case "update_issue":
          output = await tools.updateIssue(args.workspaceId, args.owner, args.repo, args.issueNumber, args.updates);
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
      message: err.message || "Internal server error executing tool."
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
