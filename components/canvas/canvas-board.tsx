"use client";

import * as React from "react";
import {
  Server,
  Database,
  Diamond,
  StickyNote,
  Type,
  LayoutGrid,
  Zap,
  Globe,
  Shield,
  Cloud,
  Box,
  Cpu,
  Trash2,
  Edit2,
  Check,
  Copy,
  Plus,
  ArrowRight,
  Minus,
  Pencil,
  Square,
  Circle,
  Move,
  CornerDownRight,
  Palette,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CanvasNode,
  CanvasConnector,
  CanvasData,
  CanvasNodeType,
  WhiteboardTool
} from "./types";
import { cn } from "@/lib/utils";

interface CanvasBoardProps {
  data: CanvasData;
  onChange: (newData: CanvasData) => void;
  activeTool: WhiteboardTool;
  onToolSelect?: (tool: WhiteboardTool) => void;
  zoom: number;
}

const colorPresets = [
  { id: "zinc", border: "#71717a", bg: "rgba(113, 113, 122, 0.12)", solidBg: "#27272a", text: "#f4f4f5" },
  { id: "indigo", border: "#6366f1", bg: "rgba(99, 102, 241, 0.15)", solidBg: "#4338ca", text: "#a5b4fc" },
  { id: "sky", border: "#0ea5e9", bg: "rgba(14, 165, 233, 0.15)", solidBg: "#0369a1", text: "#7dd3fc" },
  { id: "emerald", border: "#10b981", bg: "rgba(16, 185, 129, 0.15)", solidBg: "#047857", text: "#6ee7b7" },
  { id: "amber", border: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", solidBg: "#b45309", text: "#fde68a" },
  { id: "rose", border: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", solidBg: "#be123c", text: "#fecdd3" },
  { id: "purple", border: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", solidBg: "#7e22ce", text: "#d8b4fe" },
  { id: "yellow", border: "#eab308", bg: "rgba(234, 179, 8, 0.25)", solidBg: "#a16207", text: "#fef08a" }
];

export function CanvasBoard({
  data,
  onChange,
  activeTool,
  onToolSelect,
  zoom
}: CanvasBoardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Selection & Editing State
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editLabel, setEditLabel] = React.useState("");

  // Freehand Drawing State
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [currentDrawPoints, setCurrentDrawPoints] = React.useState<{ x: number; y: number }[]>([]);

  // Shape Drag-Creation State
  const [isCreatingShape, setIsCreatingShape] = React.useState(false);
  const [shapeStartPos, setShapeStartPos] = React.useState<{ x: number; y: number } | null>(null);
  const [liveShapeRect, setLiveShapeRect] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Dragging Node State
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Panning State
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = React.useState<{ x: number; y: number }>({
    x: data.viewport?.x || 0,
    y: data.viewport?.y || 0
  });

  // Calculate canvas coordinates from client mouse event
  const getCanvasCoords = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = Math.round((clientX - panOffset.x) / zoom);
    const y = Math.round((clientY - panOffset.y) / zoom);
    return { x, y };
  };

  // Keyboard Shortcuts: Delete, Duplicate, Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteNode(selectedId);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        duplicateNode(selectedId);
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        setEditingId(null);
        if (onToolSelect) onToolSelect("select");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, data, onToolSelect]);

  // 1. MOUSE DOWN (Create, Draw, Drag, Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    const coords = getCanvasCoords(e);

    // Pan Tool or Middle Mouse / Space
    if (activeTool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    // Freehand Drawing Tool
    if (activeTool === "draw") {
      setIsDrawing(true);
      setCurrentDrawPoints([coords]);
      return;
    }

    // Direct Click to place Sticky Note or Text
    if (activeTool === "sticky" || activeTool === "text") {
      const isSticky = activeTool === "sticky";
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        type: activeTool,
        x: coords.x - (isSticky ? 90 : 0),
        y: coords.y - (isSticky ? 60 : 10),
        width: isSticky ? 180 : 140,
        height: isSticky ? 120 : 36,
        label: isSticky ? "Idea / Note" : "Type something...",
        color: isSticky ? "yellow" : "indigo",
        fillColor: "tint",
        strokeWidth: 2,
        strokeStyle: "solid"
      };

      onChange({
        ...data,
        nodes: [...data.nodes, newNode]
      });
      setSelectedId(newNode.id);
      if (onToolSelect) onToolSelect("select");
      return;
    }

    // Drag-to-Create Shape Tools (rectangle, diamond, circle, arrow, line)
    if (["rectangle", "diamond", "circle", "arrow", "line"].includes(activeTool)) {
      setIsCreatingShape(true);
      setShapeStartPos(coords);
      setLiveShapeRect({ x: coords.x, y: coords.y, width: 2, height: 2 });
      return;
    }

    // Default Selection / Pan fallback
    setSelectedId(null);
    setEditingId(null);
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  // 2. MOUSE MOVE
  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    // Freehand Drawing in progress
    if (isDrawing) {
      setCurrentDrawPoints((prev) => [...prev, coords]);
      return;
    }

    // Shape Creation in progress
    if (isCreatingShape && shapeStartPos) {
      const x = Math.min(shapeStartPos.x, coords.x);
      const y = Math.min(shapeStartPos.y, coords.y);
      const width = Math.max(10, Math.abs(coords.x - shapeStartPos.x));
      const height = Math.max(10, Math.abs(coords.y - shapeStartPos.y));
      setLiveShapeRect({ x, y, width, height });
      return;
    }

    // Node Dragging
    if (draggingId) {
      const newX = Math.round(coords.x - dragOffset.x);
      const newY = Math.round(coords.y - dragOffset.y);

      onChange({
        ...data,
        nodes: data.nodes.map((n) =>
          n.id === draggingId ? { ...n, x: newX, y: newY } : n
        )
      });
      return;
    }

    // Viewport Panning
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  // 3. MOUSE UP
  const handleMouseUp = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    // Finish Freehand Drawing
    if (isDrawing) {
      if (currentDrawPoints.length > 1) {
        const minX = Math.min(...currentDrawPoints.map((p) => p.x));
        const minY = Math.min(...currentDrawPoints.map((p) => p.y));
        const maxX = Math.max(...currentDrawPoints.map((p) => p.x));
        const maxY = Math.max(...currentDrawPoints.map((p) => p.y));

        const newPathNode: CanvasNode = {
          id: `draw-${Date.now()}`,
          type: "draw",
          x: minX,
          y: minY,
          width: Math.max(20, maxX - minX),
          height: Math.max(20, maxY - minY),
          points: currentDrawPoints,
          color: "indigo",
          strokeWidth: 2,
          strokeStyle: "solid"
        };

        onChange({
          ...data,
          nodes: [...data.nodes, newPathNode]
        });
        setSelectedId(newPathNode.id);
      }
      setIsDrawing(false);
      setCurrentDrawPoints([]);
      if (onToolSelect) onToolSelect("select");
      return;
    }

    // Finish Shape Drag-to-Create
    if (isCreatingShape && shapeStartPos && liveShapeRect) {
      if (liveShapeRect.width > 15 || liveShapeRect.height > 15) {
        const newShapeNode: CanvasNode = {
          id: `shape-${Date.now()}`,
          type: activeTool as CanvasNodeType,
          x: liveShapeRect.x,
          y: liveShapeRect.y,
          width: liveShapeRect.width,
          height: liveShapeRect.height,
          label: activeTool === "diamond" ? "Decision?" : activeTool === "arrow" ? "" : "Label",
          color: "indigo",
          fillColor: "tint",
          strokeWidth: 2,
          strokeStyle: "solid"
        };

        onChange({
          ...data,
          nodes: [...data.nodes, newShapeNode]
        });
        setSelectedId(newShapeNode.id);
      }
      setIsCreatingShape(false);
      setShapeStartPos(null);
      setLiveShapeRect(null);
      if (onToolSelect) onToolSelect("select");
      return;
    }

    // Finish Panning
    if (isPanning) {
      onChange({
        ...data,
        viewport: { ...data.viewport, x: panOffset.x, y: panOffset.y }
      });
    }

    setDraggingId(null);
    setIsPanning(false);
  };

  // Node Mouse Down for Dragging
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (activeTool !== "select") return;
    e.stopPropagation();

    setSelectedId(node.id);
    setDraggingId(node.id);

    const coords = getCanvasCoords(e);
    setDragOffset({
      x: coords.x - node.x,
      y: coords.y - node.y
    });
  };

  // Node Double Click for Text Edit
  const handleNodeDoubleClick = (node: CanvasNode) => {
    setEditingId(node.id);
    setEditLabel(node.label || "");
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onChange({
      ...data,
      nodes: data.nodes.map((n) =>
        n.id === editingId ? { ...n, label: editLabel } : n
      )
    });
    setEditingId(null);
  };

  // Property Modifications on Selected Node
  const updateSelectedNode = (updates: Partial<CanvasNode>) => {
    if (!selectedId) return;
    onChange({
      ...data,
      nodes: data.nodes.map((n) =>
        n.id === selectedId ? { ...n, ...updates } : n
      )
    });
  };

  const deleteNode = (id: string) => {
    onChange({
      ...data,
      nodes: data.nodes.filter((n) => n.id !== id),
      connectors: data.connectors.filter((c) => c.fromNodeId !== id && c.toNodeId !== id)
    });
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateNode = (id: string) => {
    const node = data.nodes.find((n) => n.id === id);
    if (!node) return;

    const duplicate: CanvasNode = {
      ...node,
      id: `node-${Date.now()}`,
      x: node.x + 30,
      y: node.y + 30,
      points: node.points ? node.points.map((p) => ({ x: p.x + 30, y: p.y + 30 })) : undefined
    };

    onChange({
      ...data,
      nodes: [...data.nodes, duplicate]
    });
    setSelectedId(duplicate.id);
  };

  const selectedNode = data.nodes.find((n) => n.id === selectedId);

  // Helper to construct SVG smooth path for freehand points
  const getSvgPathFromPoints = (points: { x: number; y: number }[]) => {
    if (!points || points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={cn(
        "h-full w-full relative overflow-hidden bg-background select-none",
        activeTool === "pan" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : activeTool === "draw" ? "cursor-crosshair" : "cursor-default"
      )}
      style={{
        backgroundImage: `radial-gradient(var(--border) 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
      }}
    >
      {/* 1. EXCALIDRAW-STYLE FLOATING PROPERTIES INSPECTOR (When an element is selected) */}
      {selectedNode && (
        <div className="absolute top-4 left-4 z-40 bg-card/95 backdrop-blur-md p-2 rounded-2xl border border-border shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
          {/* Color Presets */}
          <div className="flex items-center gap-1 bg-accent/30 p-1 rounded-xl">
            {colorPresets.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => updateSelectedNode({ color: c.id })}
                style={{ backgroundColor: c.border }}
                className={cn(
                  "w-4 h-4 rounded-full transition-transform cursor-pointer",
                  selectedNode.color === c.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110" : "opacity-80 hover:opacity-100"
                )}
                title={c.id}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Fill Type */}
          <div className="flex items-center bg-accent/30 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => updateSelectedNode({ fillColor: "transparent" })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.fillColor === "transparent" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              None
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNode({ fillColor: "tint" })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.fillColor === "tint" || !selectedNode.fillColor ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              Tint
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNode({ fillColor: "solid" })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.fillColor === "solid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              Solid
            </button>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Stroke Width */}
          <div className="flex items-center bg-accent/30 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => updateSelectedNode({ strokeWidth: 1 })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.strokeWidth === 1 ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              S
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNode({ strokeWidth: 2 })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.strokeWidth === 2 || !selectedNode.strokeWidth ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              M
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNode({ strokeWidth: 4 })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.strokeWidth === 4 ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              L
            </button>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Stroke Style */}
          <div className="flex items-center bg-accent/30 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => updateSelectedNode({ strokeStyle: "solid" })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.strokeStyle === "solid" || !selectedNode.strokeStyle ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              —
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNode({ strokeStyle: "dashed" })}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer",
                selectedNode.strokeStyle === "dashed" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              )}
            >
              --
            </button>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Duplicate & Delete Actions */}
          <button
            type="button"
            onClick={() => duplicateNode(selectedNode.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteNode(selectedNode.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Delete (Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. SVG LAYER (Connectors, Freehand Drawings, Arrows, Lines) */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0"
        }}
      >
        <defs>
          <marker
            id="arrowhead-indigo"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
          </marker>
          <marker
            id="arrowhead-emerald"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
          <marker
            id="arrowhead-primary"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-primary" />
          </marker>
        </defs>

        {/* Freehand Drawings & Vectors */}
        {data.nodes
          .filter((n) => n.type === "draw" && n.points)
          .map((n) => {
            const preset = colorPresets.find((c) => c.id === n.color) || colorPresets[1];
            return (
              <path
                key={n.id}
                d={getSvgPathFromPoints(n.points!)}
                fill="none"
                stroke={preset.border}
                strokeWidth={n.strokeWidth || 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={n.strokeStyle === "dashed" ? "6 6" : "none"}
                className={cn(
                  "pointer-events-auto cursor-pointer transition-opacity",
                  selectedId === n.id ? "opacity-100 stroke-[3px]" : "opacity-90 hover:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(n.id);
                }}
              />
            );
          })}

        {/* Live Freehand Drawing Path preview */}
        {isDrawing && currentDrawPoints.length > 1 && (
          <path
            d={getSvgPathFromPoints(currentDrawPoints)}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* 3. INTERACTIVE NODES & SHAPES LAYER */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0"
        }}
      >
        {data.nodes
          .filter((n) => n.type !== "draw")
          .map((node) => {
            const isSelected = selectedId === node.id;
            const isEditing = editingId === node.id;
            const preset = colorPresets.find((c) => c.id === node.color) || colorPresets[1];

            const bgStyle =
              node.fillColor === "solid"
                ? preset.solidBg
                : node.fillColor === "transparent"
                ? "transparent"
                : preset.bg;

            // 1. RECTANGLE / BOX
            if (node.type === "rectangle" || node.type === "process") {
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                    backgroundColor: bgStyle,
                    borderColor: preset.border,
                    borderWidth: `${node.strokeWidth || 2}px`,
                    borderStyle: node.strokeStyle || "solid"
                  }}
                  className={cn(
                    "absolute rounded-2xl flex items-center justify-center p-3 cursor-move transition-shadow backdrop-blur-xs select-none shadow-sm",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                  )}
                >
                  {isEditing ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      autoFocus
                      className="h-7 text-xs font-bold text-center"
                    />
                  ) : (
                    <span className="text-xs font-bold text-foreground text-center line-clamp-3">
                      {node.label || ""}
                    </span>
                  )}
                </div>
              );
            }

            // 2. DIAMOND (Decision)
            if (node.type === "diamond") {
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height
                  }}
                  className={cn(
                    "absolute flex items-center justify-center cursor-move select-none",
                    isSelected && "ring-2 ring-primary rounded-xl ring-offset-2 ring-offset-background"
                  )}
                >
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon
                      points="50 0, 100 50, 50 100, 0 50"
                      fill={bgStyle}
                      stroke={preset.border}
                      strokeWidth={node.strokeWidth || 2}
                      strokeDasharray={node.strokeStyle === "dashed" ? "4 4" : "none"}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    {isEditing ? (
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                        autoFocus
                        className="h-6 text-[11px] font-bold text-center w-24"
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-foreground text-center">
                        {node.label || "Decision?"}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // 3. CIRCLE / ELLIPSE
            if (node.type === "circle") {
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                    backgroundColor: bgStyle,
                    borderColor: preset.border,
                    borderWidth: `${node.strokeWidth || 2}px`,
                    borderStyle: node.strokeStyle || "solid"
                  }}
                  className={cn(
                    "absolute rounded-full flex items-center justify-center p-3 cursor-move transition-shadow backdrop-blur-xs select-none shadow-sm",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                  )}
                >
                  {isEditing ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      autoFocus
                      className="h-6 text-[11px] font-bold text-center w-20"
                    />
                  ) : (
                    <span className="text-xs font-bold text-foreground text-center line-clamp-2">
                      {node.label || ""}
                    </span>
                  )}
                </div>
              );
            }

            // 4. ARROW / LINE
            if (node.type === "arrow" || node.type === "line") {
              const isArrow = node.type === "arrow";
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: Math.max(30, node.height)
                  }}
                  className={cn(
                    "absolute cursor-move flex items-center justify-center group",
                    isSelected && "ring-1 ring-primary rounded-lg"
                  )}
                >
                  <svg width="100%" height="100%" className="overflow-visible">
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke={preset.border}
                      strokeWidth={node.strokeWidth || 2}
                      strokeDasharray={node.strokeStyle === "dashed" ? "5 5" : "none"}
                      markerEnd={isArrow ? `url(#arrowhead-primary)` : undefined}
                    />
                  </svg>
                  {node.label && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 py-0.5 rounded border border-border text-[10px] font-bold text-foreground">
                      {node.label}
                    </div>
                  )}
                </div>
              );
            }

            // 5. STICKY NOTE
            if (node.type === "sticky") {
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    minHeight: node.height,
                    backgroundColor: bgStyle,
                    borderColor: preset.border
                  }}
                  className={cn(
                    "absolute p-3 rounded-2xl border cursor-move transition-shadow select-none shadow-md backdrop-blur-xs",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                  )}
                >
                  {isEditing ? (
                    <textarea
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={handleSaveEdit}
                      autoFocus
                      placeholder="Type note..."
                      rows={3}
                      className="w-full text-xs font-semibold bg-accent/40 p-1.5 rounded border-0 outline-none resize-none"
                    />
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mb-1">
                        <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                        <span>Sticky Note</span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line font-medium">
                        {node.label || "Click to add thought"}
                      </p>
                    </div>
                  )}
                </div>
              );
            }

            // 6. TEXT LABEL
            if (node.type === "text") {
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    left: node.x,
                    top: node.y,
                    minWidth: node.width
                  }}
                  className={cn(
                    "absolute p-1.5 cursor-move select-none rounded-lg",
                    isSelected && "ring-1 ring-primary bg-primary/5"
                  )}
                >
                  {isEditing ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      autoFocus
                      className="h-7 text-xs font-bold w-48"
                    />
                  ) : (
                    <span className="text-sm font-bold text-foreground tracking-tight">
                      {node.label || "Text label"}
                    </span>
                  )}
                </div>
              );
            }

            // 7. ARCHITECTURE SERVICE / DATABASE BLOCK
            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onDoubleClick={() => handleNodeDoubleClick(node)}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  backgroundColor: bgStyle,
                  borderColor: preset.border,
                  borderWidth: `${node.strokeWidth || 2}px`,
                  borderStyle: node.strokeStyle || "solid"
                }}
                className={cn(
                  "absolute rounded-2xl border shadow-md cursor-move overflow-hidden backdrop-blur-md transition-shadow p-3 flex flex-col justify-between select-none",
                  isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                )}
              >
                {isEditing ? (
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    autoFocus
                    className="h-7 text-xs font-bold"
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-card text-foreground shrink-0 shadow-xs border border-border/60">
                        {node.type === "database" ? <Database className="w-3.5 h-3.5 text-emerald-500" /> : <Server className="w-3.5 h-3.5 text-indigo-500" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate leading-tight">
                          {node.label || "Service"}
                        </h4>
                        {node.sublabel && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {node.sublabel}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono uppercase font-semibold">
                      <span>{node.type}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </>
                )}
              </div>
            );
          })}

        {/* 4. LIVE SHAPE DRAG-CREATION PREVIEW */}
        {isCreatingShape && liveShapeRect && (
          <div
            style={{
              left: liveShapeRect.x,
              top: liveShapeRect.y,
              width: liveShapeRect.width,
              height: liveShapeRect.height
            }}
            className="absolute rounded-xl border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
          />
        )}
      </div>
    </div>
  );
}
