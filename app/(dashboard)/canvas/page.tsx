"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Loader2,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvasToolbar } from "@/components/canvas/canvas-toolbar";
import { NotesEditor } from "@/components/canvas/notes-editor";
import { CanvasBoard } from "@/components/canvas/canvas-board";
import { AiCopilotDialog } from "@/components/canvas/ai-copilot-dialog";
import {
  CanvasDocument,
  CanvasData,
  WhiteboardTool,
  ViewMode
} from "@/components/canvas/types";
import {
  getCanvasDocumentsAction,
  createCanvasDocumentAction,
  updateCanvasDocumentAction,
  deleteCanvasDocumentAction
} from "@/app/actions/canvas";
import { getWorkspacesAction } from "@/app/actions/workspace";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function CanvasViewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlWorkspaceId = searchParams.get("workspaceId");
  const urlProjectId = searchParams.get("projectId") || "default-proj";
  const urlDocId = searchParams.get("docId");

  const [workspaceId, setWorkspaceId] = React.useState<string>(urlWorkspaceId || "default-ws");
  const [projectId, setProjectId] = React.useState<string>(urlProjectId);

  // Document Management State
  const [documents, setDocuments] = React.useState<CanvasDocument[]>([]);
  const [activeDoc, setActiveDoc] = React.useState<CanvasDocument | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Excalidraw Whiteboard Tool & View States
  const [viewMode, setViewMode] = React.useState<ViewMode>("split");
  const [activeTool, setActiveTool] = React.useState<WhiteboardTool>("select");
  const [zoom, setZoom] = React.useState(1);
  const [aiModalOpen, setAiModalOpen] = React.useState(false);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = React.useState<CanvasData[]>([]);
  const [redoStack, setRedoStack] = React.useState<CanvasData[]>([]);

  // Debounce Timer Ref for auto-saving
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load of Workspaces and Boards
  React.useEffect(() => {
    async function init() {
      setLoading(true);
      let targetWsId = urlWorkspaceId;

      if (!targetWsId) {
        const wsRes = await getWorkspacesAction();
        if (wsRes.success && wsRes.workspaces && wsRes.workspaces.length > 0) {
          targetWsId = wsRes.workspaces[0].id;
        } else {
          targetWsId = "default-ws";
        }
      }

      setWorkspaceId(targetWsId);

      // Fetch canvas boards
      const docsRes = await getCanvasDocumentsAction(targetWsId, projectId);
      if (docsRes.success && docsRes.documents && docsRes.documents.length > 0) {
        setDocuments(docsRes.documents);
        const selected = urlDocId
          ? docsRes.documents.find((d) => d.id === urlDocId) || docsRes.documents[0]
          : docsRes.documents[0];
        setActiveDoc(selected);
      } else {
        // Create initial default board if none exists
        const createRes = await createCanvasDocumentAction(
          targetWsId,
          projectId,
          "System Architecture & Specs"
        );
        if (createRes.success && createRes.document) {
          setDocuments([createRes.document]);
          setActiveDoc(createRes.document);
        }
      }

      setLoading(false);
    }

    init();
  }, [urlWorkspaceId, urlProjectId, urlDocId, projectId]);

  // 2. Debounced Auto-Save Handler
  const triggerAutoSave = React.useCallback((updatedDoc: CanvasDocument) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateCanvasDocumentAction(updatedDoc.id, {
          title: updatedDoc.title,
          content: updatedDoc.content,
          canvas_data: updatedDoc.canvas_data
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, []);

  // 3. Document Modification Handlers
  const handleTitleChange = (newTitle: string) => {
    if (!activeDoc) return;
    const updated: CanvasDocument = { ...activeDoc, title: newTitle };
    setActiveDoc(updated);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    triggerAutoSave(updated);
  };

  const handleNotesChange = (newContent: string) => {
    if (!activeDoc) return;
    const updated: CanvasDocument = { ...activeDoc, content: newContent };
    setActiveDoc(updated);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    triggerAutoSave(updated);
  };

  const handleCanvasDataChange = (newData: CanvasData) => {
    if (!activeDoc) return;

    // Push current data to undo stack
    setUndoStack((prev) => [...prev.slice(-20), activeDoc.canvas_data]);
    setRedoStack([]);

    const updated: CanvasDocument = { ...activeDoc, canvas_data: newData };
    setActiveDoc(updated);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    triggerAutoSave(updated);
  };

  // 4. Undo / Redo Handlers
  const handleUndo = () => {
    if (!activeDoc || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);

    setRedoStack((prev) => [...prev, activeDoc.canvas_data]);
    setUndoStack(newUndo);

    const updated: CanvasDocument = { ...activeDoc, canvas_data: previous };
    setActiveDoc(updated);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    triggerAutoSave(updated);
  };

  const handleRedo = () => {
    if (!activeDoc || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev, activeDoc.canvas_data]);
    setRedoStack(newRedo);

    const updated: CanvasDocument = { ...activeDoc, canvas_data: next };
    setActiveDoc(updated);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    triggerAutoSave(updated);
  };

  // 5. Create New Blank Board
  const handleCreateNewBoard = async () => {
    setLoading(true);
    const res = await createCanvasDocumentAction(
      workspaceId,
      projectId,
      `Whiteboard Canvas ${documents.length + 1}`
    );
    if (res.success && res.document) {
      setDocuments((prev) => [res.document!, ...prev]);
      setActiveDoc(res.document);
    }
    setLoading(false);
  };

  // 6. Delete Board
  const handleDeleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (documents.length <= 1) {
      alert("At least one canvas board is required in this workspace.");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this board?");
    if (!confirmDelete) return;

    await deleteCanvasDocumentAction(id);
    const remaining = documents.filter((d) => d.id !== id);
    setDocuments(remaining);
    if (activeDoc?.id === id) {
      setActiveDoc(remaining[0] || null);
    }
  };

  // 7. Zoom Handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(2, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.4, Number((prev - 0.15).toFixed(2))));
  const handleResetZoom = () => setZoom(1);

  // 8. Exports (SVG, JSON, Notes TXT)
  const handleExportNotes = () => {
    if (!activeDoc) return;
    const cleanText = activeDoc.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const blob = new Blob([cleanText || activeDoc.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeDoc.title.toLowerCase().replace(/\s+/g, "-")}-notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!activeDoc) return;
    const jsonStr = JSON.stringify(activeDoc.canvas_data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeDoc.title.toLowerCase().replace(/\s+/g, "-")}-canvas.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSvg = () => {
    if (!activeDoc) return;
    const nodes = activeDoc.canvas_data.nodes;
    let minX = 0, minY = 0, maxX = 1200, maxY = 800;

    if (nodes.length > 0) {
      minX = Math.min(...nodes.map((n) => n.x)) - 50;
      minY = Math.min(...nodes.map((n) => n.y)) - 50;
      maxX = Math.max(...nodes.map((n) => n.x + (n.width || 100))) + 50;
      maxY = Math.max(...nodes.map((n) => n.y + (n.height || 100))) + 50;
    }

    const svgWidth = Math.max(600, maxX - minX);
    const svgHeight = Math.max(400, maxY - minY);

    let svgElements = "";
    for (const node of nodes) {
      if (node.type === "draw" && node.points) {
        let d = `M ${node.points[0].x} ${node.points[0].y}`;
        for (let i = 1; i < node.points.length; i++) {
          d += ` L ${node.points[i].x} ${node.points[i].y}`;
        }
        svgElements += `<path d="${d}" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>`;
      } else {
        svgElements += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="12" fill="#1e1e24" stroke="#6366f1" stroke-width="2"/>`;
        if (node.label) {
          svgElements += `<text x="${node.x + node.width / 2}" y="${node.y + node.height / 2 + 5}" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">${node.label}</text>`;
        }
      }
    }

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="background-color: #09090b;">
      ${svgElements}
    </svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeDoc.title.toLowerCase().replace(/\s+/g, "-")}-whiteboard.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* 1. RETRACTABLE BOARDS SIDEBAR */}
      <div
        className={cn(
          "border-r border-border bg-card/60 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out shrink-0",
          sidebarOpen ? "w-64" : "w-12"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-border flex items-center justify-between h-14 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FolderOpen className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                Whiteboards
              </span>
            </div>
          ) : (
            <div className="mx-auto text-primary">
              <FolderOpen className="w-4 h-4" />
            </div>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Action Buttons */}
        {sidebarOpen && (
          <div className="p-3 space-y-2 border-b border-border/80">
            <Button
              size="sm"
              onClick={handleCreateNewBoard}
              className="w-full h-8 text-xs font-semibold justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Whiteboard</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setAiModalOpen(true)}
              className="w-full h-8 text-xs font-bold justify-start gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-indigo-500/30 text-foreground hover:bg-accent cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Generate with AI</span>
            </Button>
          </div>
        )}

        {/* Boards List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {documents.map((doc) => {
            const isSelected = activeDoc?.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setActiveDoc(doc)}
                className={cn(
                  "group flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  !sidebarOpen && "justify-center px-1"
                )}
                title={doc.title}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Layers className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary-foreground" : "text-primary")} />
                  {sidebarOpen && <span className="truncate">{doc.title}</span>}
                </div>

                {sidebarOpen && (
                  <button
                    onClick={(e) => handleDeleteBoard(doc.id, e)}
                    className={cn(
                      "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
                      isSelected
                        ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    )}
                    title="Delete board"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {loading || !activeDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-semibold">Loading whiteboard...</span>
          </div>
        ) : (
          <>
            {/* Top Toolbar */}
            <CanvasToolbar
              title={activeDoc.title}
              onTitleChange={handleTitleChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              activeTool={activeTool}
              onToolChange={setActiveTool}
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onOpenAiCopilot={() => setAiModalOpen(true)}
              onExportNotes={handleExportNotes}
              onExportSvg={handleExportSvg}
              onExportJson={handleExportJson}
              saving={saving}
            />

            {/* Content Area (Split / Notes / Canvas) */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left Pane: Notes */}
              {(viewMode === "split" || viewMode === "notes") && (
                <div
                  className={cn(
                    "h-full overflow-hidden transition-all duration-200",
                    viewMode === "split" ? "w-full lg:w-1/2" : "w-full"
                  )}
                >
                  <NotesEditor content={activeDoc.content} onChange={handleNotesChange} />
                </div>
              )}

              {/* Right Pane: Excalidraw Whiteboard Canvas */}
              {(viewMode === "split" || viewMode === "canvas") && (
                <div
                  className={cn(
                    "h-full overflow-hidden transition-all duration-200",
                    viewMode === "split" ? "w-full lg:w-1/2" : "w-full"
                  )}
                >
                  <CanvasBoard
                    data={activeDoc.canvas_data}
                    onChange={handleCanvasDataChange}
                    activeTool={activeTool}
                    onToolSelect={setActiveTool}
                    zoom={zoom}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. AI Copilot Dialog */}
      <AiCopilotDialog
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        workspaceId={workspaceId}
        projectId={projectId}
        onBoardCreated={(newDoc) => {
          setDocuments((prev) => [newDoc, ...prev]);
          setActiveDoc(newDoc);
        }}
      />
    </div>
  );
}

export default function CanvasPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-background text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-semibold">Loading Canvas & Docs...</span>
        </div>
      }
    >
      <CanvasViewClient />
    </React.Suspense>
  );
}
