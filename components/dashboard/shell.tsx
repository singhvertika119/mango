"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { getWorkspacesAction } from "@/app/actions/workspace";
import { Loader2 } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const workspaceId = searchParams.get("workspaceId");
  const [resolving, setResolving] = React.useState<boolean>(!workspaceId);

  React.useEffect(() => {
    if (!workspaceId) {
      setResolving(true);
      getWorkspacesAction().then((res) => {
        if (res.success && res.workspaces && res.workspaces.length > 0) {
          const defaultWs = res.workspaces[0];
          const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
          params.set("workspaceId", defaultWs.id);
          router.replace(`${pathname}?${params.toString()}`);
        }
        setResolving(false);
      }).catch(() => {
        setResolving(false);
      });
    } else {
      setResolving(false);
    }
  }, [workspaceId, pathname, searchParams, router]);

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
            {resolving ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-semibold">Initializing workspace...</span>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
