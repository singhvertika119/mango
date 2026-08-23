"use client";

import * as React from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload documents, write notes, and save code snippets</p>
        </div>
        <Button className="gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Add Knowledge</span>
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card text-card-foreground">
        <BookOpen className="w-12 h-12 text-muted-foreground stroke-1" />
        <h3 className="mt-4 text-lg font-semibold">No knowledge assets uploaded</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
          Upload PDF, Markdown, or text files to build context for the AI project agent.
        </p>
      </div>
    </div>
  );
}
