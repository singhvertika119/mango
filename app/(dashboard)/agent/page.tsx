"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquareCode,
  Plus,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  Bot,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getWorkspaceProjectAction, Project } from "@/app/actions/project";
import {
  getAgentSessionsAction,
  createAgentSessionAction,
  getAgentMessagesAction,
  sendAgentMessageAction,
  resolveApprovalAction,
  AgentSession,
  AgentMessage
} from "@/app/actions/agent";
import { cn } from "@/lib/utils";

export default function AgentPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [project, setProject] = React.useState<Project | null>(null);

  const [sessions, setSessions] = React.useState<AgentSession[]>([]);
  const [activeSession, setActiveSession] = React.useState<AgentSession | null>(null);
  const [messages, setMessages] = React.useState<AgentMessage[]>([]);

  const [newSessionTitle, setNewSessionTitle] = React.useState("");
  const [inputText, setInputText] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [creatingSession, setCreatingSession] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load Single Workspace Project & Sessions
  const initPage = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);

    const projRes = await getWorkspaceProjectAction(workspaceId);
    if (projRes.success && projRes.project) {
      setProject(projRes.project);
      await loadSessions(workspaceId, projRes.project.id);
    } else {
      setError(projRes.error || "Failed to load project.");
    }
    setLoading(false);
  }, [workspaceId]);

  const loadSessions = async (wsId: string, projId: string) => {
    const res = await getAgentSessionsAction(wsId, projId);
    if (res.success && res.sessions) {
      setSessions(res.sessions);
      if (res.sessions.length > 0) {
        setActiveSession(res.sessions[0]);
        await loadMessages(res.sessions[0].id);
      } else {
        setActiveSession(null);
        setMessages([]);
      }
    }
  };

  const loadMessages = async (sessionId: string) => {
    setMessagesLoading(true);
    const res = await getAgentMessagesAction(sessionId);
    if (res.success && res.messages) {
      setMessages(res.messages);
    }
    setMessagesLoading(false);
  };

  React.useEffect(() => {
    initPage();
  }, [initPage]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !project || !newSessionTitle.trim()) return;

    setCreatingSession(true);
    const res = await createAgentSessionAction(workspaceId, project.id, newSessionTitle.trim());
    setCreatingSession(false);

    if (res.success && res.session) {
      setNewSessionTitle("");
      setSessions((prev) => [res.session!, ...prev]);
      setActiveSession(res.session);
      setMessages([]);
      await loadSessions(workspaceId, project.id);
    } else {
      setError(res.error || "Failed to create session.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !project || !activeSession || !inputText.trim() || sending) return;

    const userText = inputText.trim();
    setInputText("");
    setSending(true);

    // Optimistic append user message
    const tempUserMsg: AgentMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const res = await sendAgentMessageAction(workspaceId, project.id, activeSession.id, userText);
    setSending(false);

    if (res.success && res.messages) {
      // Replace optimistic message and append assistant message
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, ...res.messages!];
      });
    } else {
      setError(res.error || "Failed to generate AI response.");
    }
  };

  const [resolvingApprovalId, setResolvingApprovalId] = React.useState<string | null>(null);

  const handleResolveApproval = async (approvalId: string, status: "APPROVED" | "REJECTED") => {
    setResolvingApprovalId(approvalId);
    try {
      const res = await resolveApprovalAction(approvalId, status);
      if (res.success && res.messages) {
        setMessages((prev) => [...prev, ...res.messages!]);
      }
    } catch (err) {
      console.error("Failed to resolve approval:", err);
    } finally {
      setResolvingApprovalId(null);
      // Reload messages to update statuses
      if (activeSession) {
        const msgsRes = await getAgentMessagesAction(activeSession.id);
        if (msgsRes.success && msgsRes.messages) {
          setMessages(msgsRes.messages);
        }
      }
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <MessageSquareCode className="w-12 h-12 text-muted-foreground stroke-1" />
        <h3 className="mt-4 text-lg font-semibold">No active workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select or create a workspace from the sidebar switcher to load agent.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      {/* 1. LEFT SIDEBAR: Sessions list */}
      <div className="w-64 border border-border border-solid rounded-xl bg-card flex flex-col justify-between overflow-hidden shrink-0">
        <div className="p-4 flex flex-col gap-3 overflow-hidden flex-1">
          {project && (
            <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary flex items-center justify-between">
              <span className="truncate">{project.name}</span>
              <span className="text-[10px] uppercase font-bold text-primary/70 tracking-wider">Project</span>
            </div>
          )}

          <div className="border-t border-border mt-1 pt-3 flex-1 flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2 px-1">Chats</span>
            
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-1">
                {sessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => {
                      setActiveSession(sess);
                      loadMessages(sess.id);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all truncate block cursor-pointer",
                      activeSession?.id === sess.id
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {sess.title}
                  </button>
                ))}
                {sessions.length === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-4">No active conversations.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* New Chat Session Form */}
        <form onSubmit={handleCreateSession} className="p-3 border-t border-border bg-card/60 space-y-2">
          <Input
            type="text"
            placeholder="New chat topic..."
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            className="h-8 text-xs placeholder:text-muted-foreground"
            required
            disabled={!project}
          />
          <Button type="submit" size="sm" className="w-full text-xs gap-1 h-8 cursor-pointer" disabled={creatingSession || !project}>
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </form>
      </div>

      {/* 2. CENTER PANEL: Main Chat Screen */}
      <div className="flex-1 border border-border border-solid rounded-xl bg-card/40 flex flex-col justify-between overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">
                {activeSession ? activeSession.title : "Workspace Agent"}
              </h2>
              <span className="text-[10px] text-muted-foreground block font-medium">
                {project ? project.name : "Loading..."}
              </span>
            </div>
          </div>
        </div>

        {/* Chat Message Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Loading project context...</span>
            </div>
          ) : !activeSession ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquareCode className="w-10 h-10 stroke-1" />
              <h3 className="mt-4 text-sm font-semibold">Start a Conversation</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Type a topic title in the sidebar form on the left to spawn your project agent.
              </p>
            </div>
          ) : messagesLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Loading chat...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isAgent = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 max-w-4xl items-start",
                      isAgent ? "mr-auto" : "ml-auto flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full shrink-0 shadow-xs",
                      isAgent ? "bg-primary/10 text-primary border border-primary/20" : "bg-primary text-primary-foreground"
                    )}>
                      {isAgent ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col gap-2 max-w-3xl">
                      <div className={cn(
                        "p-4 rounded-2xl text-xs leading-relaxed font-medium whitespace-pre-line shadow-xs border border-solid",
                        isAgent
                          ? "bg-card border-border text-foreground rounded-tl-xs"
                          : "bg-primary border-primary/20 text-primary-foreground rounded-tr-xs"
                      )}>
                        {msg.content}
                      </div>

                      {isAgent && msg.metadata?.hasPendingApproval && msg.metadata?.approvalId && (
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <Button
                            size="sm"
                            onClick={() => handleResolveApproval(msg.metadata!.approvalId!, "APPROVED")}
                            disabled={resolvingApprovalId !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer h-7 text-[10px] px-3.5 rounded-md shadow-sm"
                          >
                            {resolvingApprovalId === msg.metadata.approvalId ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            <span>Approve Action</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleResolveApproval(msg.metadata!.approvalId!, "REJECTED")}
                            disabled={resolvingApprovalId !== null}
                            className="font-semibold cursor-pointer h-7 text-[10px] px-3.5 rounded-md"
                          >
                            <span>Reject</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex gap-3 max-w-md mr-auto items-start">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 bg-card border border-border border-solid rounded-2xl rounded-tl-xs text-xs text-muted-foreground flex items-center gap-2.5 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Analyzing RAG indexes and compiling response...</span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3.5 border-t border-border bg-card/60 flex gap-2.5 shrink-0">
          <Input
            type="text"
            placeholder={activeSession ? "Ask about tasks, checklist, code, or knowledge base..." : "Select conversation topic..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!activeSession || sending}
            className="flex-1 h-10 text-xs placeholder:text-muted-foreground bg-accent/20"
            required
          />
          <Button type="submit" size="icon" disabled={!activeSession || sending || !inputText.trim()} className="h-10 w-10 shrink-0 cursor-pointer">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
