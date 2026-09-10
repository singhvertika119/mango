"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Search,
  Sparkles,
  Sun,
  Moon,
  Check,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  FileText,
  CheckSquare,
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  MessageSquareCode,
  Settings,
  Puzzle,
  Loader2,
  ChevronDown,
  Layers,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getNotificationsAction, markNotificationAsReadAction, Notification } from "@/app/actions/notifications";
import { getWorkspacesAction, createWorkspaceAction } from "@/app/actions/workspace";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export function Topbar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const workspaceId = searchParams.get("workspaceId");

  const [workspaceName, setWorkspaceName] = React.useState("Select Workspace");
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  // Workspace Switcher State
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = React.useState<any | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const loadWorkspaces = React.useCallback(async () => {
    const res = await getWorkspacesAction();
    if (res.success && res.workspaces && res.workspaces.length > 0) {
      setWorkspaces(res.workspaces);
      const matched = res.workspaces.find((w: any) => w.id === workspaceId) || res.workspaces[0];
      setActiveWorkspace(matched || null);
      if (matched) {
        setWorkspaceName(matched.name);
      }
    }
  }, [workspaceId]);

  React.useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleSwitchWorkspace = (ws: any) => {
    setActiveWorkspace(ws);
    setWorkspaceName(ws.name);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("workspaceId", ws.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setCreating(true);
    const res = await createWorkspaceAction(newWorkspaceName.trim());
    setCreating(false);
    if (res.success && res.workspace) {
      setNewWorkspaceName("");
      setCreateDialogOpen(false);
      loadWorkspaces();

      const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
      params.set("workspaceId", res.workspace.id);
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "WS";
    return name.substring(0, 2).toUpperCase();
  };

  // Command Palette Search State
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<{
    tasks: { id: string; title: string; status: string }[];
    docs: { id: string; name: string }[];
  }>({ tasks: [], docs: [] });
  const [searching, setSearching] = React.useState(false);

  // Global key listener to trigger Command Palette (Ctrl+K or Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Async query tasks and documents when query input changes
  React.useEffect(() => {
    if (!paletteOpen) {
      setSearchQuery("");
      setSearchResults({ tasks: [], docs: [] });
      return;
    }

    if (!searchQuery.trim() || !workspaceId) {
      setSearchResults({ tasks: [], docs: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("id, title, status")
          .eq("workspace_id", workspaceId)
          .ilike("title", `%${searchQuery}%`)
          .limit(5);

        const { data: docsData } = await supabase
          .from("documents")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .ilike("name", `%${searchQuery}%`)
          .limit(5);

        setSearchResults({
          tasks: (tasksData as any) || [],
          docs: (docsData as any) || []
        });
      } catch (e) {
        console.error("Search query failed:", e);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, paletteOpen, workspaceId, supabase]);

  const defaultNavs = [
    { name: "Go to Dashboard", href: `/dashboard?workspaceId=${workspaceId || ""}`, icon: LayoutDashboard },
    { name: "Go to Project Settings", href: `/projects?workspaceId=${workspaceId || ""}`, icon: FolderKanban },
    { name: "Go to Canvas & Docs", href: `/canvas?workspaceId=${workspaceId || ""}`, icon: Layers },
    { name: "Go to Tasks", href: `/tasks?workspaceId=${workspaceId || ""}`, icon: CheckSquare },
    { name: "Go to Knowledge Base", href: `/knowledge?workspaceId=${workspaceId || ""}`, icon: BookOpen },
    { name: "Go to Agent Console", href: `/agent?workspaceId=${workspaceId || ""}`, icon: MessageSquareCode },
    { name: "Go to Integrations", href: `/integrations?workspaceId=${workspaceId || ""}`, icon: Puzzle },
    { name: "Go to Settings", href: `/settings?workspaceId=${workspaceId || ""}`, icon: Settings },
  ];

  // Notifications State
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const loadNotifications = React.useCallback(async () => {
    if (!workspaceId) return;
    const res = await getNotificationsAction(workspaceId);
    if (res.success && res.notifications) {
      setNotifications(res.notifications);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    loadNotifications();

    if (!workspaceId) return;

    const channel = supabase
      .channel(`notifications:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, loadNotifications, supabase]);

  // Click outside to close notifications dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    setNotifOpen(false);
    if (!notif.is_read) {
      await markNotificationAsReadAction(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => markNotificationAsReadAction(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(nextTheme);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <header className="flex items-center justify-between h-14 border-b border-border px-6 bg-card/40 shrink-0 select-none">
        {/* Left Side: Search Bar */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => setPaletteOpen(true)}
            className="relative w-72 hidden sm:block cursor-pointer group animate-in duration-100"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <Input
              type="text"
              readOnly
              placeholder="Search files, tasks, settings..."
              className="pl-9 h-8 text-xs bg-accent/30 border-border placeholder:text-muted-foreground focus-visible:ring-primary/20 cursor-pointer pointer-events-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground bg-accent border border-border px-1.5 py-0.5 rounded pointer-events-none">
              Ctrl K
            </div>
          </div>
        </div>

        {/* Right Side Actions (Switcher, Ask Agent, Theme, Notifications) */}
        <div className="flex items-center gap-3 relative animate-in duration-100" ref={dropdownRef}>
          {/* Workspace Switcher in Top Right - Always Visible */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 cursor-pointer text-xs font-bold tracking-tight text-foreground bg-accent/50 hover:bg-accent border border-border border-solid px-3 py-1.5 rounded-xl outline-none select-none transition-all">
              <div className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                {activeWorkspace ? getInitials(activeWorkspace.name) : <Layers className="w-3 h-3" />}
              </div>
              <span className="max-w-[130px] truncate">{activeWorkspace ? activeWorkspace.name : "Select Workspace"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" side="bottom" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold px-2 py-1.5 uppercase tracking-wider">
                  Workspaces
                </DropdownMenuLabel>
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws)}
                    className={cn(
                      "flex items-center justify-between gap-2 cursor-pointer py-2 px-2.5 rounded-lg text-xs",
                      activeWorkspace?.id === ws.id ? "bg-accent font-bold text-accent-foreground" : ""
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                        {getInitials(ws.name)}
                      </div>
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {activeWorkspace?.id === ws.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex items-center gap-2 cursor-pointer text-primary py-2 px-2.5 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                  <span>Create Workspace</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Ask Agent Quick Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/agent?workspaceId=${workspaceId || ""}`)}
            className="hidden sm:flex items-center gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold rounded-full h-8 px-3 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Ask Agent</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-lg cursor-pointer"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative text-muted-foreground hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-lg cursor-pointer animate-in duration-100"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 min-w-3.5 h-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Notifications Dropdown Panel */}
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 rounded-xl border border-solid border-border bg-card shadow-lg z-50 overflow-hidden text-xs">
              <div className="flex items-center justify-between p-3 border-b border-border bg-accent/30">
                <span className="font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold text-primary hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
                    <Inbox className="w-8 h-8 stroke-1 text-muted-foreground/60" />
                    <span>No notifications yet.</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    let Icon = Info;
                    let iconColor = "text-blue-500 bg-blue-500/10";
                    if (notif.type === "success") {
                      Icon = CheckCircle2;
                      iconColor = "text-emerald-500 bg-emerald-500/10";
                    } else if (notif.type === "warning" || notif.type === "approval") {
                      Icon = AlertCircle;
                      iconColor = "text-amber-500 bg-amber-500/10";
                    }

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex gap-3 p-3.5 hover:bg-accent/40 cursor-pointer transition-colors ${
                          !notif.is_read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-bold truncate text-foreground ${!notif.is_read ? "font-extrabold" : ""}`}>
                              {notif.title}
                            </span>
                            {!notif.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {workspaceId && (
                <div className="p-2.5 border-t border-solid border-border text-center bg-accent/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotifOpen(false);
                      router.push(`/agent?workspaceId=${workspaceId}`);
                    }}
                    className="w-full text-[10px] font-semibold text-muted-foreground hover:text-foreground h-7 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Open Agent Console</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Command Palette Search Dialog */}
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card shadow-2xl">
          <div className="flex items-center border-b border-solid border-border px-4 py-3 gap-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search files, tasks, workspace settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 text-sm outline-none placeholder:text-muted-foreground text-foreground"
              autoFocus
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
          </div>

          <div className="max-h-96 overflow-y-auto p-2 text-xs space-y-4">
            {!searchQuery.trim() ? (
              <div className="space-y-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Navigation Shortcuts</div>
                <div className="space-y-0.5">
                  {defaultNavs.map((nav, idx) => {
                    const Icon = nav.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setPaletteOpen(false);
                          router.push(nav.href);
                        }}
                        className="flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-lg text-foreground hover:bg-accent cursor-pointer bg-transparent border-0 text-xs font-semibold"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{nav.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.tasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Matched Tasks</div>
                    <div className="space-y-0.5">
                      {searchResults.tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => {
                            setPaletteOpen(false);
                            router.push(`/tasks?workspaceId=${workspaceId}&taskId=${task.id}`);
                          }}
                          className="flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-lg text-foreground hover:bg-accent cursor-pointer bg-transparent border-0 text-xs font-semibold justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate text-foreground">{task.title}</span>
                          </div>
                          <span className="text-[9px] font-bold uppercase border border-solid border-border px-1.5 py-0.5 rounded bg-accent text-muted-foreground tracking-wide shrink-0">
                            {task.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.docs.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Matched Documents</div>
                    <div className="space-y-0.5">
                      {searchResults.docs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setPaletteOpen(false);
                            router.push(`/knowledge?workspaceId=${workspaceId}`);
                          }}
                          className="flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-lg text-foreground hover:bg-accent cursor-pointer bg-transparent border-0 text-xs font-semibold"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate text-foreground">{doc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.tasks.length === 0 && searchResults.docs.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground font-semibold">
                    <span>No results matched "{searchQuery}"</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Create Workspace</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new workspace to organize your tasks, projects, and documents.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace}>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="topbar-ws-name" className="text-xs font-semibold">Workspace Name</Label>
                <Input
                  id="topbar-ws-name"
                  placeholder="e.g. Acme Production, DeFi Launch"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  required
                  className="h-9 text-xs border-border placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
                className="text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newWorkspaceName.trim()}
                className="text-xs h-9 font-semibold cursor-pointer"
              >
                {creating ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
