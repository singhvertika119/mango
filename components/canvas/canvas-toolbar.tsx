"use client";

import * as React from "react";
import {
  Columns,
  FileText,
  LayoutGrid,
  Sparkles,
  Download,
  MousePointer,
  Hand,
  Pencil,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Type,
  StickyNote,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Loader2,
  Undo2,
  Redo2,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { WhiteboardTool, ViewMode } from "./types";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activeTool: WhiteboardTool;
  onToolChange: (tool: WhiteboardTool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenAiCopilot: () => void;
  onExportNotes: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  saving: boolean;
}

export function CanvasToolbar({
  title,
  onTitleChange,
  viewMode,
  onViewModeChange,
  activeTool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenAiCopilot,
  onExportNotes,
  onExportSvg,
  onExportJson,
  saving
}: CanvasToolbarProps) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [tempTitle, setTempTitle] = React.useState(title);

  React.useEffect(() => {
    setTempTitle(title);
  }, [title]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle !== title) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  const tools: { id: WhiteboardTool; label: string; icon: React.ElementType; shortcut?: string }[] = [
    { id: "select", label: "Select (1)", icon: MousePointer, shortcut: "1" },
    { id: "pan", label: "Pan Hand (2)", icon: Hand, shortcut: "2" },
    { id: "draw", label: "Draw Pen (3)", icon: Pencil, shortcut: "3" },
    { id: "rectangle", label: "Rectangle (4)", icon: Square, shortcut: "4" },
    { id: "diamond", label: "Diamond (5)", icon: Diamond, shortcut: "5" },
    { id: "circle", label: "Circle (6)", icon: Circle, shortcut: "6" },
    { id: "arrow", label: "Arrow (7)", icon: ArrowRight, shortcut: "7" },
    { id: "line", label: "Line (8)", icon: Minus, shortcut: "8" },
    { id: "text", label: "Text (9)", icon: Type, shortcut: "9" },
    { id: "sticky", label: "Sticky Note (0)", icon: StickyNote, shortcut: "0" }
  ];

  return (
    <div className="h-14 border-b border-border bg-card/85 backdrop-blur-md px-3 flex items-center justify-between gap-2 shrink-0 select-none overflow-x-auto">
      {/* 1. LEFT: Title, Autosave & View Switcher */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          {isEditingTitle ? (
            <Input
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setTempTitle(title);
                }
              }}
              autoFocus
              className="h-7 text-xs font-bold w-40 sm:w-56 px-2"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-xs font-bold text-foreground truncate cursor-pointer hover:bg-accent/50 px-2 py-1 rounded-md transition-colors max-w-[150px] sm:max-w-[200px]"
              title="Click to rename board"
            >
              {title || "Untitled Canvas"}
            </h1>
          )}
        </div>

        {/* Auto-save Status */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground font-medium pl-0.5">
          {saving ? (
            <>
              <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-500" />
              <span className="text-muted-foreground/80">Saved</span>
            </>
          )}
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-accent/40 p-0.5 rounded-lg border border-border/80">
          <button
            onClick={() => onViewModeChange("split")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
              viewMode === "split" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title="Split (Notes + Canvas)"
          >
            <Columns className="w-3 h-3" />
            <span className="hidden md:inline">Split</span>
          </button>
          <button
            onClick={() => onViewModeChange("notes")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
              viewMode === "notes" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title="Notes Only"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden md:inline">Notes</span>
          </button>
          <button
            onClick={() => onViewModeChange("canvas")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
              viewMode === "canvas" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title="Canvas Only"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden md:inline">Canvas</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER: Excalidraw Style Whiteboard Toolbar (when Canvas is visible) */}
      {viewMode !== "notes" && (
        <div className="flex items-center bg-accent/30 p-1 rounded-xl border border-border/80 gap-0.5 shadow-inner">
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToolChange(t.id)}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-all cursor-pointer relative group",
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/80"
                )}
                title={t.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

        </div>
      )}

      {/* 3. RIGHT: Undo/Redo, Zoom, AI Copilot & Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Undo / Redo */}
        {viewMode !== "notes" && (
          <div className="hidden lg:flex items-center bg-accent/30 rounded-lg p-0.5 border border-border/60">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Zoom Controls */}
        {viewMode !== "notes" && (
          <div className="hidden md:flex items-center bg-accent/30 rounded-lg p-0.5 border border-border/60">
            <button
              onClick={onZoomOut}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono font-bold text-muted-foreground px-1.5 text-center min-w-8">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={onResetZoom}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* AI Copilot Button */}
        <Button
          size="sm"
          onClick={onOpenAiCopilot}
          className="h-7 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer px-2.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI Copilot</span>
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md hover:bg-accent border border-border/60">
            <Download className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-xs">
            <DropdownMenuLabel>Export &amp; Share</DropdownMenuLabel>
            <DropdownMenuItem onClick={onExportSvg} className="cursor-pointer gap-2">
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export Whiteboard SVG</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportJson} className="cursor-pointer gap-2">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export Canvas JSON</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportNotes} className="cursor-pointer gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Download Notes (.txt)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
