"use client";

import * as React from "react";
import { Sparkles, Loader2, Wand2, Lightbulb, Zap, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateAiCanvasBoardAction } from "@/app/actions/canvas";
import { CanvasDocument } from "./types";

interface AiCopilotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId: string;
  onBoardCreated: (doc: CanvasDocument) => void;
}

const STARTER_PROMPTS = [
  {
    title: "Next.js + Supabase Architecture",
    prompt: "A modern web application using Next.js 15 App Router, Supabase Auth & PostgreSQL, Edge Functions, and AWS S3 storage."
  },
  {
    title: "AI RAG Search Pipeline",
    prompt: "A Retrieval-Augmented Generation (RAG) system with Next.js frontend, Python FastAPI backend, Pinecone vector database, and Groq LLM inference."
  },
  {
    title: "E-Commerce Microservices",
    prompt: "Event-driven e-commerce platform with API Gateway, Order Service, Payment Gateway, Kafka Event Bus, and Redis Cache."
  },
  {
    title: "OAuth 2.0 Auth Flow",
    prompt: "OAuth 2.0 & JWT authentication flow between Single-Page App, Identity Provider, API Gateway, and Protected Resource Servers."
  }
];

export function AiCopilotDialog({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  onBoardCreated
}: AiCopilotDialogProps) {
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await generateAiCanvasBoardAction(prompt.trim(), workspaceId, projectId);
      if (res.success && res.document) {
        setPrompt("");
        onOpenChange(false);
        onBoardCreated(res.document);
      } else {
        setError(res.error || "Failed to generate architecture board.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStarter = (starterText: string) => {
    setPrompt(starterText);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border shadow-2xl p-0 overflow-hidden">
        {/* Header with decorative gradient */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border-b border-border">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-bold text-foreground">
                AI Architect & Diagram Copilot
              </DialogTitle>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/20">
                Eraser AI
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Describe a system architecture, flowchart, or feature flow. Antigravity AI will simultaneously generate Notion-style technical notes and a visual whiteboard diagram with nodes & Mermaid.js code.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="ai-prompt" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>What would you like to design?</span>
              <span className="text-[10px] text-muted-foreground font-normal">Powered by Llama 3.3</span>
            </label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Design a real-time multiplayer collaborative whiteboarding service with WebSockets, Redis pub/sub, and PostgreSQL persistence..."
              rows={4}
              className="resize-none text-xs bg-accent/30 border-border placeholder:text-muted-foreground/70 focus-visible:ring-primary/20"
              autoFocus
            />
          </div>

          {/* Quick starter chips */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>Try an example template</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STARTER_PROMPTS.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectStarter(item.prompt)}
                  className="flex flex-col items-start text-left p-2.5 rounded-lg border border-border bg-accent/20 hover:bg-accent/60 hover:border-primary/40 transition-all cursor-pointer group"
                >
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {item.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !prompt.trim()}
              className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Architecture...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Generate Specs & Diagram</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
