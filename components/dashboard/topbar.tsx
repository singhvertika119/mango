"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bell, Search, Sparkles, Sun, Moon, Check, Inbox, CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getNotificationsAction, markNotificationAsReadAction, Notification } from "@/app/actions/notifications";

export function Topbar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const workspaceId = searchParams.get("workspaceId");
  
  const [workspaceName, setWorkspaceName] = React.useState("Workspace");
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

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
    // Poll notifications every 10 seconds for real-time responsiveness
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Click outside to close dropdown
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
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markNotificationAsReadAction(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  React.useEffect(() => {
    if (workspaceId) {
      supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single()
        .then(({ data }) => {
          if (data) setWorkspaceName(data.name);
        });
    }
  }, [workspaceId, supabase]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(nextTheme);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="flex items-center justify-between h-14 border-b border-border px-6 bg-card/40 shrink-0 select-none">
      {/* Search Bar / Workspace Title */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold tracking-tight text-foreground bg-accent border border-border border-solid px-2.5 py-1 rounded-lg">
          {workspaceName}
        </span>
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files, tasks, settings..."
            className="pl-9 h-8 text-xs bg-accent/30 border-border placeholder:text-muted-foreground focus-visible:ring-primary/20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground bg-accent border border-border px-1.5 py-0.5 rounded pointer-events-none">
            Ctrl K
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Ask Agent Quick Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/agent?workspaceId=${workspaceId}`)}
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
          className="relative text-muted-foreground hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-lg cursor-pointer"
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
                notifications.map(notif => {
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
  );
}
