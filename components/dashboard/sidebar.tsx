"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Sliders,
  CheckSquare,
  BookOpen,
  MessageSquareCode,
  Puzzle,
  Layers,
  Settings,
  ChevronsUpDown,
  Plus,
  Sparkles,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  Building2,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  { name: "Project Settings", href: "/projects", icon: Sliders },
  { name: "Canvas & Docs", href: "/canvas", icon: Layers },
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
  const [loadingWorkspaces, setLoadingWorkspaces] = React.useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // User Profile State
  const [userEmail, setUserEmail] = React.useState<string>("");
  const [fullName, setFullName] = React.useState<string>("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const [updatingProfile, setUpdatingProfile] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  // Password state
  const [newPassword, setNewPassword] = React.useState("");
  const [updatingPassword, setUpdatingPassword] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadWorkspaces = React.useCallback(async (selectId?: string) => {
    const targetId = selectId || searchParams.get("workspaceId");

    setLoadingWorkspaces(true);
    const res = await getWorkspacesAction();
    if (res.success && res.workspaces && res.workspaces.length > 0) {
      setWorkspaces(res.workspaces);
      const matched = res.workspaces.find((w) => w.id === targetId) || res.workspaces[0];
      setActiveWorkspace(matched);
    } else {
      // Auto create a workspace if user has none
      const autoCreate = await createWorkspaceAction("Mango Workspace");
      if (autoCreate.success && autoCreate.workspace) {
        setWorkspaces([autoCreate.workspace]);
        setActiveWorkspace(autoCreate.workspace);
      }
    }
    setLoadingWorkspaces(false);
  }, [searchParams]);

  const loadUserProfile = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const email = user.email || "";
        setUserEmail(email);

        let name = user.user_metadata?.full_name || user.user_metadata?.name || "";

        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single();

          if (profile?.full_name) {
            name = profile.full_name;
          }
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        } catch (e) {
          // ignore error
        }

        if (!name && email) {
          const prefix = email.split("@")[0];
          name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        }

        setFullName(name || "User");
      }
    } catch (err: any) {
      console.warn("Could not retrieve user details:", err?.message);
    }
  }, [supabase]);

  React.useEffect(() => {
    loadUserProfile();
    loadWorkspaces();
  }, [loadUserProfile, loadWorkspaces]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: fullName, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw error;
        alert("Profile name updated successfully!");
        setProfileDialogOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update profile name.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setAvatarUrl(publicUrl);
      alert("Profile picture updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert("Password updated successfully!");
      setNewPassword("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    const res = await createWorkspaceAction(newWorkspaceName.trim());
    setCreating(false);

    if (res.success && res.workspace) {
      setNewWorkspaceName("");
      setDialogOpen(false);
      loadWorkspaces(res.workspace.id);

      const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
      params.set("workspaceId", res.workspace.id);
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handleSwitchWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("workspaceId", ws.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (e) {
      console.error("Logout error:", e);
    }
    // Hard navigate to ensure all states/cookies are fully reset
    window.location.href = "/login";
  };

  const getInitials = (name: string) => {
    if (!name) return "MG";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const currentWorkspaceId = activeWorkspace?.id || searchParams.get("workspaceId");

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out h-screen sticky top-0 z-20 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Sidebar Branding (Logo) */}
      <div className={cn("flex items-center px-4 border-b border-border h-16 shrink-0", collapsed ? "justify-center px-2" : "justify-start gap-3")}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <span className="text-xs text-white font-black leading-none">m</span>
            </div>
            <span className="text-[24px] font-black tracking-tighter text-foreground font-sans">
              mango
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-amber-500/20">
            m
          </div>
        )}
      </div>

      {/* Workspace Switcher in Sidebar */}
      <div className="p-3 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center justify-between w-full p-2 rounded-xl bg-accent/40 hover:bg-accent/80 border border-border border-solid transition-all cursor-pointer text-left outline-none",
              collapsed && "justify-center p-0 w-10 h-10 mx-auto"
            )}
          >
            {!collapsed ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                    {activeWorkspace ? getInitials(activeWorkspace.name) : "WS"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {activeWorkspace ? activeWorkspace.name : "Select Workspace"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                      Personal Workspace
                    </span>
                  </div>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
              </>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                {activeWorkspace ? getInitials(activeWorkspace.name) : "WS"}
              </div>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-60" align={collapsed ? "center" : "start"} side="bottom">
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
              Workspaces
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleSwitchWorkspace(ws)}
                  className={cn(
                    "flex items-center justify-between gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg",
                    activeWorkspace?.id === ws.id ? "bg-accent font-bold text-accent-foreground" : ""
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      {getInitials(ws.name)}
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {activeWorkspace?.id === ws.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary py-2 px-2.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const hrefWithParam = currentWorkspaceId
            ? `${item.href}?workspaceId=${currentWorkspaceId}`
            : item.href;

          return (
            <Link key={item.name} href={hrefWithParam}>
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all relative group cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-0 h-10 w-10 mx-auto"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
                {collapsed && (
                  <span className="absolute left-14 bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border border-border border-solid opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 font-medium">
                    {item.name}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile & Controls */}
      <div className="p-3 border-t border-border space-y-2">
        <Link href={currentWorkspaceId ? `/settings?workspaceId=${currentWorkspaceId}` : "/settings"}>
          <span
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all relative group cursor-pointer",
              pathname === "/settings" && "bg-accent text-accent-foreground font-semibold",
              collapsed && "justify-center px-0 h-10 w-10 mx-auto"
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
            {collapsed && (
              <span className="absolute left-14 bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border border-border border-solid opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 font-medium">
                Settings
              </span>
            )}
          </span>
        </Link>

        {/* User profile dropdown & collapse toggle */}
        <div className={cn("flex items-center gap-2 pt-2 border-t border-border", collapsed ? "justify-center flex-col" : "justify-between")}>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-2 text-left rounded-xl p-1.5 hover:bg-accent hover:text-accent-foreground transition-all outline-none flex-1 min-w-0 cursor-pointer bg-transparent border border-transparent hover:border-border",
                collapsed && "p-0 justify-center flex-initial"
              )}
            >
              <Avatar className="w-8 h-8 shrink-0 ring-1 ring-border">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {fullName ? getInitials(fullName) : userEmail ? userEmail.substring(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold truncate text-foreground">
                    {fullName || userEmail?.split("@")[0] || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {userEmail || "Signed in"}
                  </span>
                </div>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align={collapsed ? "center" : "start"} side="top">
              <DropdownMenuLabel className="px-2 py-1.5">
                <p className="text-xs font-bold text-foreground truncate">{fullName || userEmail?.split("@")[0] || "User"}</p>
                <p className="text-[10px] text-muted-foreground font-normal truncate mt-0.5">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setProfileDialogOpen(true)}
                className="flex items-center gap-2 cursor-pointer text-xs font-medium py-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-destructive hover:bg-destructive/10 py-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1">
            {/* Direct Logout Button */}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Log Out"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0 cursor-pointer rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Collapse/Expand Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8 shrink-0 cursor-pointer rounded-lg"
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create Workspace</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Workspaces isolate your project settings, task boards, and knowledge base.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name" className="text-xs font-semibold">Workspace Name</Label>
              <Input
                id="ws-name"
                type="text"
                placeholder="e.g. Acme Engineering, DeFi Launch"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
                className="h-9 text-xs"
                autoFocus
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={creating} className="text-xs h-9 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newWorkspaceName.trim()} className="text-xs h-9 font-semibold cursor-pointer">
                {creating ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* My Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">User Profile</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage your personal information and credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2.5 pb-4 border-b border-border group">
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden cursor-pointer ring-4 ring-primary/10 hover:ring-primary/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="w-full h-full">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {fullName ? getInitials(fullName) : userEmail ? userEmail.substring(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <div className="text-center">
                <h4 className="font-bold text-foreground text-sm">{fullName || "User"}</h4>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="profile-email" className="text-xs font-semibold">Email Address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-accent/40 border-border opacity-75 cursor-not-allowed text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-fullname" className="text-xs font-semibold">Full Name</Label>
                <Input
                  id="profile-fullname"
                  type="text"
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Security & Password section */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Security & Password</h4>
              <div className="space-y-1.5">
                <Label htmlFor="profile-password" className="text-xs font-semibold">New Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="profile-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={updatingPassword || !newPassword.trim()}
                    className="cursor-pointer text-xs h-9 shrink-0 font-semibold"
                  >
                    {updatingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)} disabled={updatingProfile} className="text-xs h-9 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={updatingProfile} className="text-xs h-9 font-semibold cursor-pointer">
                {updatingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
