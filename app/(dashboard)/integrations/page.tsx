"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Puzzle,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Key,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getIntegrationsAction,
  disconnectGithubAction,
  saveGithubPatAction,
  mockConnectGithubAction,
} from "@/app/actions/integrations";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [connected, setConnected] = React.useState(false);
  const [isValid, setIsValid] = React.useState<boolean | null>(null);
  const [authType, setAuthType] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [name, setName] = React.useState<string | null>(null);
  const [isPlaceholder, setIsPlaceholder] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // PAT input state
  const [patToken, setPatToken] = React.useState("");
  const [showPat, setShowPat] = React.useState(false);
  const [savingPat, setSavingPat] = React.useState(false);
  const [showPatForm, setShowPatForm] = React.useState(false);

  const checkStatus = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    const res = await getIntegrationsAction(workspaceId);
    if (res.success) {
      setConnected(!!res.connected);
      setIsValid(res.isValid ?? null);
      setAuthType(res.authType || null);
      setUsername(res.username || null);
      setAvatarUrl(res.avatarUrl || null);
      setName(res.name || null);
      setIsPlaceholder(!!res.isPlaceholder);
      if (res.error && res.connected && !res.isValid) {
        setError(res.error);
      }
    } else {
      setError(res.error || "Failed to load integrations status.");
    }
    setLoading(false);
  }, [workspaceId]);

  React.useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleOAuthConnect = () => {
    if (!workspaceId) return;

    if (!isSupabaseConfigured || isPlaceholder) {
      mockConnectGithubAction().then(() => {
        setConnected(true);
        setIsValid(true);
      });
      return;
    }

    // Redirect to GitHub OAuth router
    window.location.href = `/api/auth/github?workspaceId=${workspaceId}`;
  };

  const handleSavePat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !patToken.trim()) return;

    setSavingPat(true);
    setError(null);
    setSuccessMsg(null);

    const res = await saveGithubPatAction(workspaceId, patToken.trim());
    setSavingPat(false);

    if (res.success) {
      setSuccessMsg(`Successfully authenticated as @${res.username}!`);
      setPatToken("");
      setShowPatForm(false);
      checkStatus();
    } else {
      setError(res.error || "Failed to validate Personal Access Token.");
    }
  };

  const handleDisconnect = async () => {
    if (!workspaceId) return;
    setDisconnecting(true);
    setError(null);
    setSuccessMsg(null);
    const res = await disconnectGithubAction(workspaceId);
    setDisconnecting(false);
    if (res.success) {
      setConnected(false);
      setIsValid(null);
      setUsername(null);
      setAvatarUrl(null);
      setName(null);
      setShowPatForm(false);
      setSuccessMsg("GitHub disconnected.");
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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external developer tools and repositories to your workspace context
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Authentication Notice</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/20 border-solid">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* GITHUB INTEGRATION CARD */}
        <Card className="border-border bg-card/70 flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-5 pb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-foreground text-background shrink-0 shadow-md">
                <GitBranch className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold">GitHub</CardTitle>
                  {loading ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Checking</span>
                    </span>
                  ) : connected && isValid ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-solid border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Connected</span>
                    </span>
                  ) : connected && !isValid ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-solid border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Expired / Invalid</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Not Connected
                    </span>
                  )}
                </div>
                <CardDescription className="mt-1 text-xs leading-relaxed">
                  Sync repository commits, manage pull requests, search issues, and inspect project code directly in Agent Chat.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-5 py-2 space-y-4">
              {/* Authenticated user badge if connected and valid */}
              {connected && isValid && username && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={username}
                        className="w-8 h-8 rounded-full border border-border"
                      />
                    ) : (
                      <UserCheck className="w-6 h-6 text-primary" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span>{name || username}</span>
                        <span className="text-muted-foreground font-normal">(@{username})</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span className="uppercase text-[9px] font-bold tracking-wider px-1 rounded bg-muted">
                          {authType || "PAT"}
                        </span>
                        <span>• Active token verified</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Invalid / Expired Warning */}
              {connected && !isValid && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Token Expired or Revoked
                  </p>
                  <p className="text-[11px] leading-normal">
                    GitHub returned 401 Bad credentials. Enter a new Personal Access Token below or reconnect via OAuth to resume agent repository operations.
                  </p>
                </div>
              )}

              {/* PAT Form */}
              {(showPatForm || (!connected && !loading) || (connected && !isValid)) && (
                <form onSubmit={handleSavePat} className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-primary" />
                        <span>GitHub Personal Access Token (PAT)</span>
                      </label>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:user"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        Generate Token <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPat ? "text" : "password"}
                        placeholder="ghp_... or github_pat_..."
                        value={patToken}
                        onChange={(e) => setPatToken(e.target.value)}
                        className="text-xs pr-8 h-9 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPat(!showPat)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Requires <code>repo</code> scope for private repos and commit/PR reading.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingPat || !patToken.trim()}
                      className="text-xs h-8 cursor-pointer flex-1"
                    >
                      {savingPat ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                          <span>Verifying & Saving...</span>
                        </>
                      ) : (
                        <span>Save & Verify Token</span>
                      )}
                    </Button>
                    {connected && isValid && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPatForm(false)}
                        className="text-xs h-8 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </div>

          <CardContent className="px-5 pb-5 pt-3 border-t border-border flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={checkStatus}
              disabled={loading}
              className="h-8 text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              <span>Test Connection</span>
            </Button>

            <div className="flex items-center gap-2">
              {connected && isValid && !showPatForm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPatForm(true)}
                  className="h-8 text-xs cursor-pointer"
                >
                  <Key className="w-3 h-3 mr-1.5" />
                  <span>Update Token</span>
                </Button>
              )}

              {connected ? (
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
                  variant="secondary"
                  className="cursor-pointer h-8 text-xs font-semibold"
                  onClick={handleOAuthConnect}
                >
                  <span>OAuth Login</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* WORKSPACE MCP CARD */}
        <Card className="border-border bg-card/60 flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-5 pb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-primary shrink-0 shadow-sm border border-solid border-primary/20">
                <Puzzle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">Workspace MCP</CardTitle>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-solid border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                </div>
                <CardDescription className="mt-1 text-xs leading-relaxed">
                  In-app Model Context Protocol Server-Sent Events service exposing local project tools, RAG documentation chunks, and knowledge snippets.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-5 py-2 space-y-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1.5">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Transport Protocol:</span>
                  <span className="font-mono text-[11px] text-primary">SSE (Server-Sent Events)</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Endpoint: <code>/api/mcp/workspace</code> &amp; <code>/api/mcp/github</code>
                </div>
              </div>
            </CardContent>
          </div>

          <CardContent className="px-5 pb-5 pt-3 border-t border-border flex justify-end items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-[11px] text-emerald-500">Live SSE Ready</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Integrations...</div>}>
      <IntegrationsContent />
    </React.Suspense>
  );
}

