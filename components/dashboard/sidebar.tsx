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
  PanelLeftOpen
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
import logo from "@/public/mango_logo.png";

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
  const [loading, setLoading] = React.useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // User Profile State
  const [userEmail, setUserEmail] = React.useState("developer@mango.dev");
  const [fullName, setFullName] = React.useState("Developer");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const [updatingProfile, setUpdatingProfile] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  // Password state
  const [newPassword, setNewPassword] = React.useState("");
  const [updatingPassword, setUpdatingPassword] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Click outside listener to close the custom profile menu
  React.useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const loadWorkspaces = React.useCallback(async (selectId?: string) => {
    const targetId = selectId || searchParams.get("workspaceId");
    
    // If workspaces are already loaded, just update the active selection without DB roundtrip
    setWorkspaces((currentWorkspaces) => {
      if (currentWorkspaces.length > 0) {
        const matched = currentWorkspaces.find((w) => w.id === targetId) || currentWorkspaces[0];
        setActiveWorkspace(matched);
        return currentWorkspaces;
      }
      return currentWorkspaces;
    });

    setLoading(true);
    const res = await getWorkspacesAction();
    if (res.success && res.workspaces) {
      setWorkspaces(res.workspaces);
      if (res.workspaces.length > 0) {
        const matched = res.workspaces.find((w) => w.id === targetId) || res.workspaces[0];
        setActiveWorkspace(matched);
      } else {
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
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single();
          if (profile?.full_name) {
            setFullName(profile.full_name);
          }
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        } catch (e) {
          console.log("Offline mode, using default profile name.");
        }
      }
    });

    loadWorkspaces();
  }, [loadWorkspaces, supabase.auth]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: fullName })
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

      // Upload image to public bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Generate public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update public.profiles avatar_url
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
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
      {/* Sidebar Branding (Logo) */}
      <div className={cn("flex items-center px-4 border-b border-border h-16 select-none", collapsed ? "justify-center px-2" : "justify-start gap-3")}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <span className="text-xs text-white font-black leading-none">m</span>
            </div>
            <span className="text-[25px] font-black tracking-tighter text-foreground font-sans">
              mango
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-amber-500/20">
            m
          </div>
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
        <div className={cn("flex items-center gap-2 pt-2 border-t border-border mt-2 relative", collapsed ? "justify-center flex-col" : "justify-between")} ref={menuRef}>
          {!collapsed ? (
            <div className="relative flex-1 min-w-0">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 text-left rounded-lg p-1 hover:bg-accent hover:text-accent-foreground transition-all outline-none w-full cursor-pointer bg-transparent border-0"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {userEmail.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate">{fullName}</span>
                  <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute bottom-11 left-0 w-52 rounded-xl border border-solid border-border bg-card shadow-lg z-50 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-100 text-xs">
                  <div className="px-2 py-1.5 font-bold text-foreground border-b border-solid border-border mb-1">
                    <p className="font-semibold text-foreground truncate">{fullName}</p>
                    <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">{userEmail}</p>
                  </div>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setProfileDialogOpen(true);
                    }}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-foreground hover:bg-accent cursor-pointer border-0 bg-transparent text-xs font-semibold"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Profile</span>
                  </button>

                  <button
                    disabled
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-muted-foreground/50 cursor-not-allowed border-0 bg-transparent text-xs font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upgrade Plan (Disabled)</span>
                  </button>

                  <div className="h-px bg-border my-1" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer border-0 bg-transparent text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Avatar className="w-8 h-8 cursor-pointer animate-in duration-100" onClick={() => setProfileOpen(!profileOpen)}>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
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

      {/* My Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              View and edit your personal profile information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2.5 pb-4 border-b border-solid border-border group">
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden cursor-pointer ring-4 ring-primary/10 hover:ring-primary/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="w-full h-full">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {userEmail.substring(0, 2).toUpperCase()}
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
                <h4 className="font-bold text-foreground">{fullName}</h4>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email Address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-accent/45 border-border opacity-70 cursor-not-allowed text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-fullname">Full Name</Label>
                <Input
                  id="profile-fullname"
                  type="text"
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            {/* Divider and Password Change section */}
            <div className="border-t border-solid border-border pt-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Security & Password</h4>
              <div className="space-y-1.5">
                <Label htmlFor="profile-password">New Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="profile-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 text-xs"
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
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)} disabled={updatingProfile}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatingProfile} className="cursor-pointer">
                {updatingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
