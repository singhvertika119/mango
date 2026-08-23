"use client";

import * as React from "react";
import { Puzzle, GitBranch, ShieldCheck } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect external services to your workspace context</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-foreground text-background shrink-0">
              <GitBranch className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-bold">GitHub</CardTitle>
              <CardDescription className="mt-1">
                Link codebases, sync commits, create issues, and authorize pull request reviews.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0">
            <Button size="sm" className="cursor-pointer">Connect GitHub</Button>
          </CardContent>
        </Card>

        <Card className="border-border opacity-70">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
              <Puzzle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-bold">Workspace MCP</CardTitle>
              <CardDescription className="mt-1">
                Local Model Context Protocol service exposing database query tools to the AI Agent.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0 items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Configuring in Phase 9</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
