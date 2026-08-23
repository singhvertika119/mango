"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Search, Sparkles, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function Topbar() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const workspaceId = searchParams.get("workspaceId");
  const [workspaceName, setWorkspaceName] = React.useState("Workspace");
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    if (workspaceId) {
      supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single()
        .then(({ data }) => {
          if (data?.name) {
            setWorkspaceName(data.name);
          }
        });
    }
  }, [workspaceId, supabase]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-border bg-card text-card-foreground z-10 sticky top-0">
      {/* Breadcrumbs / Left Title */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Workspaces</span>
        <span className="text-sm font-medium text-muted-foreground">/</span>
        <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">
          {workspaceName}
        </span>
      </div>

      {/* Center Search / Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-6 relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
        <Input
          placeholder="Search workspace... (Ctrl + K)"
          className="pl-9 pr-12 h-9 w-full bg-accent/40 border-border hover:bg-accent/60 focus:bg-background focus:ring-1 focus:ring-primary/20 transition-all rounded-lg text-sm outline-none"
          readOnly
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground bg-accent border border-border px-1.5 py-0.5 rounded pointer-events-none">
          Ctrl K
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Ask Agent Quick Trigger */}
        <Button
          variant="outline"
          size="sm"
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

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-lg cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  );
}
