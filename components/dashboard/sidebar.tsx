"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BookOpen,
  MessageSquareCode,
  Puzzle,
  Settings,
  ChevronsUpDown,
  Plus,
  Sparkles,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createWorkspaceAction, getWorkspacesAction } from "@/app/actions/workspace";
import { createClient } from "@/lib/supabase/client";

interface Workspace {
  id: string;
  name: string;
}

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Agent Chat", href: "/agent", icon: MessageSquareCode },
  { name: "Integrations", href: "/integrations", icon: Puzzle }
];

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = React.useState<Workspace | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  
  // User Profile State
  const [userEmail, setUserEmail] = React.useState("developer@mango.dev");

  const loadWorkspaces = React.useCallback(async (selectId?: string) => {
    setLoading(true);
    const res = await getWorkspacesAction();
    if (res.success && res.workspaces) {
      setWorkspaces(res.workspaces);
      if (res.workspaces.length > 0) {
        // Decide which workspace to activate
        const targetId = selectId || searchParams.get("workspaceId") || res.workspaces[0].id;
        const matched = res.workspaces.find((w) => w.id === targetId) || res.workspaces[0];
        setActiveWorkspace(matched);
      } else {
        // No workspaces found, auto-create a default workspace for seamless onboarding
        const autoCreate = await createWorkspaceAction("Mango Workspace");
        if (autoCreate.success && autoCreate.workspace) {
          setWorkspaces([autoCreate.workspace]);
          setActiveWorkspace(autoCreate.workspace);
        }
      }
    }
    setLoading(false);
  }, [searchParams]);

  React.useEffect(() => {
    // Get user details
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    loadWorkspaces();
  }, [loadWorkspaces, supabase.auth]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    const res = await createWorkspaceAction(newWorkspaceName.trim());
    setCreating(false);

    if (res.success && res.workspace) {
      setNewWorkspaceName("");
      setDialogOpen(false);
      // Reload and select the newly created workspace
      loadWorkspaces(res.workspace.id);
    }
  };

  const handleSwitchWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    // Refresh page with workspace parameter
    const params = new URLSearchParams(searchParams);
    params.set("workspaceId", ws.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  // Get initials for Avatar/Fallback
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out h-screen sticky top-0 z-20",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Workspace Switcher */}
      <div className={cn("flex items-center justify-between p-4 border-b border-border h-16", collapsed && "justify-center px-2")}>
        {!collapsed ? (
          activeWorkspace ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 w-full text-left rounded-lg p-2 hover:bg-accent hover:text-accent-foreground transition-all group outline-none cursor-pointer">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-semibold shrink-0">
                  {getInitials(activeWorkspace.name)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate group-hover:text-accent-foreground">
                    {activeWorkspace.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    Workspace
                  </span>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 align-start" side="bottom" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
                    Workspaces
                  </DropdownMenuLabel>
                  {workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws)}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        activeWorkspace.id === ws.id && "bg-accent font-medium text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-semibold shrink-0">
                        {getInitials(ws.name)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm truncate">{ws.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center gap-2 cursor-pointer text-primary"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Create Workspace</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-xs text-muted-foreground p-2">Loading...</div>
          )
        ) : (
          activeWorkspace && (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
              {getInitials(activeWorkspace.name)}
            </div>
          )
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          // Append active workspace parameter to keep context
          const hrefWithParam = activeWorkspace
            ? `${item.href}?workspaceId=${activeWorkspace.id}`
            : item.href;

          return (
            <Link key={item.name} href={hrefWithParam}>
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all relative group cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-0 h-10 w-10 mx-auto"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
                {collapsed && (
                  <span className="absolute left-14 bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-md border border-border border-solid opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                    {item.name}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <Link href={activeWorkspace ? `/settings?workspaceId=${activeWorkspace.id}` : "/settings"}>
          <span
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all relative group cursor-pointer",
              pathname === "/settings" && "bg-accent text-accent-foreground",
              collapsed && "justify-center px-0 h-10 w-10 mx-auto"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
            {collapsed && (
              <span className="absolute left-14 bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-md border border-border border-solid opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                Settings
              </span>
            )}
          </span>
        </Link>

        {/* User profile dropdown & collapse toggle */}
        <div className={cn("flex items-center gap-2 pt-2 border-t border-border mt-2", collapsed ? "justify-center flex-col" : "justify-between")}>
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-left rounded-lg p-1 hover:bg-accent hover:text-accent-foreground transition-all outline-none flex-1 min-w-0 cursor-pointer">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {userEmail.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">User Profile</span>
                  <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="top">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">User Profile</p>
                      <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Upgrade Plan</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {userEmail.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8 shrink-0 cursor-pointer"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Creation Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Workspaces isolate your projects, task boards, and knowledge base.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Engineering Hub"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
