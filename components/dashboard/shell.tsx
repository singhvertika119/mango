"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigation */}
      <React.Suspense fallback={<div className="w-64 border-r border-border bg-card/60 shrink-0" />}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </React.Suspense>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <React.Suspense fallback={<div className="h-14 border-b border-border bg-card/60 shrink-0" />}>
          <Topbar />
        </React.Suspense>

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto bg-accent/20 p-6 relative">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
