"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Puzzle, GitBranch, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getIntegrationsAction, disconnectGithubAction, mockConnectGithubAction } from "@/app/actions/integrations";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [connected, setConnected] = React.useState(false);
  const [isPlaceholder, setIsPlaceholder] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checkStatus = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    const res = await getIntegrationsAction(workspaceId);
    if (res.success) {
      setConnected(!!res.connected);
      setIsPlaceholder(!!res.isPlaceholder);
    } else {
      setError(res.error || "Failed to load integrations status.");
    }
    setLoading(false);
  }, [workspaceId]);

  React.useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleConnect = () => {
    if (!workspaceId) return;
    
    if (!isSupabaseConfigured || isPlaceholder) {
      // Offline or placeholder mode mock connect
      mockConnectGithubAction().then(() => setConnected(true));
      return;
    }

    // Redirect to GitHub OAuth router
    window.location.href = `/api/auth/github?workspaceId=${workspaceId}`;
  };

  const handleDisconnect = async () => {
    if (!workspaceId) return;
    setDisconnecting(true);
    const res = await disconnectGithubAction(workspaceId);
    setDisconnecting(false);
    if (res.success) {
      setConnected(false);
    } else {
      setError(res.error || "Failed to disconnect GitHub.");
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Puzzle className="w-12 h-12 text-muted-foreground stroke-1 animate-pulse" />
        <h3 className="mt-4 text-lg font-semibold">No active workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select or create a workspace from the sidebar switcher to load integrations dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect external services to your workspace context</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid max-w-md">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* GITHUB CARD */}
        <Card className="border-border bg-card/60">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-foreground text-background shrink-0 shadow-md">
              <GitBranch className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">GitHub</CardTitle>
                {connected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-solid border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Connected</span>
                  </span>
                )}
              </div>
              <CardDescription className="mt-1 text-xs">
                Link codebases, sync commits, create issues, and authorize pull request reviews directly.
              </CardDescription>
              {isPlaceholder && (
                <div className="text-[10px] text-amber-600 bg-amber-500/10 p-2 rounded-lg mt-2 border border-solid border-amber-500/20 leading-normal max-w-sm">
                  ⚠️ <code>GITHUB_CLIENT_ID</code> contains placeholder credentials in <code>.env.local</code>. Connecting will activate a simulated GitHub mock state rather than redirecting to GitHub.
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0 p-4">
            {loading ? (
              <Button size="sm" variant="outline" disabled className="h-8">
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                <span>Checking...</span>
              </Button>
            ) : connected ? (
              <Button
                size="sm"
                variant="destructive"
                className="cursor-pointer h-8 text-xs font-semibold"
                disabled={disconnecting}
                onClick={handleDisconnect}
              >
                {disconnecting && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                <span>Disconnect</span>
              </Button>
            ) : (
              <Button
                size="sm"
                className="cursor-pointer h-8 text-xs font-semibold"
                onClick={handleConnect}
              >
                <span>Connect GitHub</span>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* WORKSPACE MCP CARD */}
        <Card className="border-border bg-card/40 opacity-90">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/15 text-primary shrink-0 shadow-sm border border-solid border-primary/20">
              <Puzzle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-bold">Workspace MCP</CardTitle>
              <CardDescription className="mt-1 text-xs">
                In-app Model Context Protocol Server-Sent Events service exposing local database tools to the Agent.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end pt-0 p-4 items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-[11px] text-emerald-500">Active (SSE Transport)</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
