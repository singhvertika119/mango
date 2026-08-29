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
  User as UserIcon,
  BookOpen,
  CheckSquare,
  Activity,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProjectsAction } from "@/app/actions/project";
import {
  getAgentSessionsAction,
  createAgentSessionAction,
  getAgentMessagesAction,
  sendAgentMessageAction,
  AgentSession,
  AgentMessage
} from "@/app/actions/agent";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
}

export default function AgentPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState("");

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

  // Load Projects & Sessions
  const initPage = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);

    // Fetch projects
    const projectsRes = await getProjectsAction(workspaceId);
    if (projectsRes.success && projectsRes.projects) {
      setProjects(projectsRes.projects);
      if (projectsRes.projects.length > 0) {
        const defaultProjId = projectsRes.projects[0].id;
        setSelectedProjectId(defaultProjId);
        
        // Fetch sessions for this project
        await loadSessions(workspaceId, defaultProjId);
      }
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

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    if (!workspaceId) return;
    setMessagesLoading(true);
    await loadSessions(workspaceId, projId);
    setMessagesLoading(false);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !selectedProjectId || !newSessionTitle.trim()) return;

    setCreatingSession(true);
    const res = await createAgentSessionAction(workspaceId, selectedProjectId, newSessionTitle.trim());
    setCreatingSession(false);

    if (res.success && res.session) {
      setNewSessionTitle("");
      setSessions((prev) => [res.session!, ...prev]);
      setActiveSession(res.session);
      setMessages([]);
      await loadSessions(workspaceId, selectedProjectId);
    } else {
      setError(res.error || "Failed to create session.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !selectedProjectId || !activeSession || !inputText.trim() || sending) return;

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

    const res = await sendAgentMessageAction(workspaceId, selectedProjectId, activeSession.id, userText);
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
        <div className="p-4 flex flex-col gap-4 overflow-hidden flex-1">
          <div className="space-y-1.5 shrink-0">
            <Label htmlFor="agentProjSelect" className="text-xs font-semibold text-muted-foreground">Active Project</Label>
            <select
              id="agentProjSelect"
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-hidden shrink-0"
              disabled={projects.length === 0}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

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
            disabled={projects.length === 0}
          />
          <Button type="submit" size="sm" className="w-full text-xs gap-1 h-8 cursor-pointer" disabled={creatingSession || projects.length === 0}>
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
                {projects.find((p) => p.id === selectedProjectId)?.name || "Select Project"}
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

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="w-10 h-10 text-primary animate-pulse stroke-1" />
              <h3 className="mt-4 text-sm font-semibold">No Projects Created</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                You must create a project first in the Projects tab before chatting with the agent.
              </p>
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
                      "flex gap-3 max-w-2xl items-start",
                      isAgent ? "mr-auto" : "ml-auto flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
                      isAgent ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                    )}>
                      {isAgent ? <Bot className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                    </div>

                    <div className={cn(
                      "p-3.5 rounded-2xl text-xs leading-relaxed font-medium whitespace-pre-line shadow-xs border border-solid",
                      isAgent
                        ? "bg-card border-border text-foreground rounded-tl-xs"
                        : "bg-primary border-primary/20 text-primary-foreground rounded-tr-xs"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex gap-3 max-w-md mr-auto items-start">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 bg-card border border-border border-solid rounded-2xl rounded-tl-xs text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing RAG indexes and compiling response...</span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card/60 flex gap-2 shrink-0">
          <Input
            type="text"
            placeholder={activeSession ? "Ask about tasks, checklist, or knowledge..." : "Select conversation topic..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!activeSession || sending}
            className="flex-1 h-9 placeholder:text-muted-foreground"
            required
          />
          <Button type="submit" size="icon" disabled={!activeSession || sending || !inputText.trim()} className="h-9 w-9 shrink-0 cursor-pointer">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* 3. RIGHT PANEL: Context Brain Panel (Real-Time RAG view) */}
      <div className="w-72 border border-border border-solid rounded-xl bg-card p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary fill-current" />
          <span>Project Brain Context</span>
        </h3>

        <div className="space-y-4 text-xs">
          {/* Summary status */}
          <div className="space-y-1.5 p-3 rounded-lg bg-accent/40 border border-border border-solid">
            <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              <span>Context Collator</span>
            </span>
            <p className="text-[11px] leading-relaxed text-foreground">
              Retrieves semantic vector document chunks and syncs metadata context in real-time.
            </p>
          </div>

          {/* Model information */}
          <div className="space-y-1">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wide block">LLM Engine</span>
            <div className="text-[11px] font-medium text-foreground bg-accent/30 border border-border border-solid px-2.5 py-1.5 rounded-lg flex items-center justify-between">
              <span>Groq Llama 3.1</span>
              <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded font-mono">70B</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wide block">Local Embedding</span>
            <div className="text-[11px] font-medium text-foreground bg-accent/30 border border-border border-solid px-2.5 py-1.5 rounded-lg flex items-center justify-between">
              <span>GTE-Small ONNX</span>
              <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded font-mono">384-D</span>
            </div>
          </div>

          {/* Prompt injection overview */}
          <div className="border-t border-border pt-3 space-y-3">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider block">Prompt Scope</span>
            
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>Structured Tasks</span>
                </span>
                <span className="font-semibold text-emerald-500">Active</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>Activity Logs</span>
                </span>
                <span className="font-semibold text-emerald-500">Active</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Notes & Snippets</span>
                </span>
                <span className="font-semibold text-emerald-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
