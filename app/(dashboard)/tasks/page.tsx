"use client";

import * as React from "react";
import { CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan, organize, and execute project deliverables</p>
        </div>
        <Button className="gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card text-card-foreground">
        <CheckSquare className="w-12 h-12 text-muted-foreground stroke-1" />
        <h3 className="mt-4 text-lg font-semibold">No tasks created yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
          Get started by creating a new task, or ask the AI project agent to draft tasks from your documentation.
        </p>
      </div>
    </div>
  );
}
