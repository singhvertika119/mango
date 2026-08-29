"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Settings, Shield, User, Bell, Terminal, RefreshCw, AlertCircle, Info, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSystemLogsAction } from "@/app/actions/observability";
import { updateWorkspaceNameAction, deleteWorkspaceAction } from "@/app/actions/workspace";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

interface LogEntry {
  id: string;
  level: string;
  component: string;
  message: string;
  metadata: any;
  created_at: string;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"profile" | "logs">("profile");

  // Workspace settings state
  const [wsName, setWsName] = React.useState("");
  const [updatingWorkspace, setUpdatingWorkspace] = React.useState(false);
  const [deletingWorkspace, setDeletingWorkspace] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (workspaceId) {
      const supabase = createClient();
      supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single()
        .then(({ data }) => {
          if (data?.name) {
            setWsName(data.name);
          }
        });
    }
  }, [workspaceId]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !wsName.trim()) return;
    setUpdatingWorkspace(true);
    const res = await updateWorkspaceNameAction(workspaceId, wsName.trim());
    setUpdatingWorkspace(false);
    if (res.success) {
      alert("Workspace name updated successfully!");
      window.location.reload(); // Reload to refresh Sidebar and Topbar titles
    } else {
      alert(res.error || "Failed to update workspace name.");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    setDeletingWorkspace(true);
    const res = await deleteWorkspaceAction(workspaceId);
    setDeletingWorkspace(false);
    setDeleteConfirmOpen(false);
    if (res.success) {
      alert("Workspace deleted successfully.");
      router.push("/dashboard");
    } else {
      alert(res.error || "Failed to delete workspace.");
    }
  };

  // Logs state
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [filterLevel, setFilterLevel] = React.useState<string>("all");
  const [selectedLog, setSelectedLog] = React.useState<LogEntry | null>(null);

  const fetchLogs = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoadingLogs(true);
    const res = await getSystemLogsAction(workspaceId);
    if (res.success && res.logs) {
      setLogs(res.logs as LogEntry[]);
    }
    setLoadingLogs(false);
  }, [workspaceId]);

  React.useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (filterLevel === "all") return true;
    return log.level.toLowerCase() === filterLevel.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage workspace preferences and audit diagnostic logs</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border border-solid gap-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 border-solid cursor-pointer flex items-center gap-1.5 ${
            activeTab === "profile"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Workspace Profile</span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 border-solid cursor-pointer flex items-center gap-1.5 ${
            activeTab === "logs"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>System Diagnostics</span>
        </button>
      </div>

      {activeTab === "profile" ? (
        <div className="grid gap-6">
          <Card className="border-border bg-card/60">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Workspace Profile</CardTitle>
                <CardDescription className="text-xs">Manage names and project domains</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                <div className="flex flex-col gap-2 max-w-sm">
                  <label className="text-xs font-semibold text-muted-foreground">Workspace Name</label>
                  <input
                    type="text"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-border bg-accent/40 px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary/20"
                  />
                </div>
                <Button type="submit" size="sm" disabled={updatingWorkspace} className="cursor-pointer text-xs font-semibold h-8">
                  {updatingWorkspace ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* DANGER ZONE FOR WORKSPACE DELETION */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-destructive">Danger Zone</CardTitle>
                <CardDescription className="text-xs text-destructive/70">Irreversible actions on this workspace environment</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex flex-col gap-2.5">
              <p className="text-xs text-muted-foreground leading-normal max-w-md font-medium">
                Deleting this workspace will immediately remove all connected projects, documents, tasks, cheatsheets, and integration records. This action cannot be undone.
              </p>
              <div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="cursor-pointer text-xs font-semibold h-8"
                >
                  Delete Workspace
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delete confirmation dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Workspace?</span>
                </DialogTitle>
                <DialogDescription className="pt-2 text-xs font-medium leading-relaxed">
                  Are you absolutely sure you want to delete **{wsName}**? All projects, task boards, parsed files, and notes in this sandbox will be permanently purged.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deletingWorkspace}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeleteWorkspace} disabled={deletingWorkspace} className="cursor-pointer">
                  {deletingWorkspace ? "Deleting..." : "Permanently Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        /* OBSERVABILITY LOGS VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={filterLevel === "all" ? "default" : "outline"}
                onClick={() => setFilterLevel("all")}
                className="cursor-pointer h-7 text-[10px] font-semibold px-3"
              >
                All Logs
              </Button>
              <Button
                size="sm"
                variant={filterLevel === "info" ? "default" : "outline"}
                onClick={() => setFilterLevel("info")}
                className="cursor-pointer h-7 text-[10px] font-semibold px-3"
              >
                Info
              </Button>
              <Button
                size="sm"
                variant={filterLevel === "warn" ? "default" : "outline"}
                onClick={() => setFilterLevel("warn")}
                className="cursor-pointer h-7 text-[10px] font-semibold px-3"
              >
                Warnings
              </Button>
              <Button
                size="sm"
                variant={filterLevel === "error" ? "default" : "outline"}
                onClick={() => setFilterLevel("error")}
                className="cursor-pointer h-7 text-[10px] font-semibold px-3"
              >
                Errors
              </Button>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              disabled={loadingLogs}
              onClick={fetchLogs}
              className="cursor-pointer h-7 text-[10px] font-semibold px-3 gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingLogs ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 items-start">
            {/* Logs List Table */}
            <Card className="md:col-span-2 border-border bg-card/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="max-h-[50vh] overflow-y-auto divide-y divide-border">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-xs font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span>Loading logs...</span>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-xs font-semibold">
                      <span>No diagnostic logs match active filters.</span>
                    </div>
                  ) : (
                    filteredLogs.map(log => {
                      let levelClass = "text-blue-500 bg-blue-500/10 border-blue-500/20";
                      if (log.level === "warn") levelClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                      if (log.level === "error") levelClass = "text-rose-500 bg-rose-500/10 border-rose-500/20";

                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`flex items-start gap-3 p-3.5 hover:bg-accent/40 cursor-pointer transition-colors text-xs ${
                            selectedLog?.id === log.id ? "bg-accent/60" : ""
                          }`}
                        >
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border border-solid shrink-0 uppercase tracking-wider ${levelClass}`}>
                            {log.level}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded border border-solid border-border shrink-0">
                            {log.component}
                          </span>
                          <p className="flex-1 min-w-0 font-medium text-foreground leading-relaxed break-words">
                            {log.message}
                          </p>
                          <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5 font-semibold">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Log Details Inspector */}
            <Card className="border-border bg-card/40 h-full">
              <CardHeader className="p-4 border-b border-border bg-accent/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Log Inspector</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3.5">
                {selectedLog ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border border-solid pb-2 text-[10px] text-muted-foreground font-semibold">
                      <span>ID: {selectedLog.id.slice(0, 8)}...</span>
                      <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-muted-foreground block text-[10px]">LOG MESSAGE:</span>
                      <p className="font-medium text-foreground leading-relaxed bg-accent/30 p-2.5 rounded-lg border border-solid border-border select-all">
                        {selectedLog.message}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-muted-foreground block text-[10px]">METADATA PAYLOAD:</span>
                      <pre className="text-[10px] font-mono bg-accent/60 p-2.5 rounded-lg border border-solid border-border text-foreground overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed select-all">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground font-medium">
                    <span>Select a log row from the list to inspect metadata payloads.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
