"use client";

import * as React from "react";
import { MessageSquareCode, Sparkles } from "lucide-react";

export default function AgentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">Interact with your AI project manager and execution agent</p>
      </div>

      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card text-card-foreground">
        <MessageSquareCode className="w-12 h-12 text-primary stroke-1" />
        <h3 className="mt-4 text-lg font-semibold flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 fill-current text-primary" />
          <span>Agent offline</span>
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
          Complete Supabase Auth and Database connection phases to initialize the AI Agent interface.
        </p>
      </div>
    </div>
  );
}
