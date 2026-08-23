"use client";

import * as React from "react";
import {
  Sparkles,
  GitBranch,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Play
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const dummyStats = {
  totalTasks: 24,
  completedTasks: 16,
  inProgressTasks: 5,
  blockedTasks: 1,
  progressPercentage: 66,
};

const recentActivities = [
  { id: 1, type: "task", message: "User profile integration completed", user: "User Profile", time: "10 mins ago" },
  { id: 2, type: "document", message: "Uploaded Mango_PRD.md to Knowledge Base", user: "You", time: "1 hour ago" },
  { id: 3, type: "github", message: "New pull request #14 opened in main", user: "git-bot", time: "2 hours ago" },
  { id: 4, type: "agent", message: "Agent action CREATE_TASK approved by Admin", user: "System", time: "4 hours ago" }
];

const mockInsights = [
  { id: 1, title: "Database Performance Boost", text: "Create an index on workspace_members(profile_id) to improve query response times by up to 40%." },
  { id: 2, title: "GitHub Sync Alert", text: "The PRD has been modified. The agent recommends creating a sync task to update tasks accordingly." }
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-linear-to-r from-primary/10 via-primary/5 to-card rounded-2xl border border-primary/10 border-solid">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, Developer!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace Mango is active. The AI project agent is ready to assist you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
          <Button size="sm" variant="outline" className="gap-2 border-primary/20 bg-background cursor-pointer">
            <Play className="w-4 h-4 fill-primary" />
            <span>Resume Agent Session</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Progress Card */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Project Progress</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyStats.progressPercentage}%</div>
            <div className="w-full bg-accent rounded-full h-1.5 mt-2">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${dummyStats.progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dummyStats.completedTasks} of {dummyStats.totalTasks} tasks completed
            </p>
          </CardContent>
        </Card>

        {/* Tasks Stats */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyStats.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active engineering cycles
            </p>
          </CardContent>
        </Card>

        {/* Knowledge Base Documents */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Knowledge base</CardTitle>
            <FileText className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">
              Parsed documents & snippets
            </p>
          </CardContent>
        </Card>

        {/* GitHub Status */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">GitHub Integration</CardTitle>
            <GitBranch className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">Connected</div>
            <p className="text-xs text-muted-foreground mt-1">
              Repository: <code className="text-[11px] font-mono bg-accent px-1 py-0.5 rounded">webd/mango</code>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity */}
        <Card className="md:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent Activity</CardTitle>
              <CardDescription>Updates across tasks, documents, and git commits</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 cursor-pointer">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{act.message}</p>
                  <p className="text-xs text-muted-foreground">
                    By {act.user} • {act.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-bold text-base">
              <Sparkles className="w-5 h-5 fill-current text-primary" />
              <span>AI Insights</span>
            </div>
            <CardDescription>Contextual project analysis from the agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockInsights.map((insight) => (
              <div key={insight.id} className="space-y-1.5 p-3 rounded-lg bg-accent/40 border border-border border-solid text-sm">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span>{insight.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
