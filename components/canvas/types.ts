export type WhiteboardTool =
  | "select"
  | "pan"
  | "draw"
  | "rectangle"
  | "diamond"
  | "circle"
  | "arrow"
  | "line"
  | "text"
  | "sticky";

export type CanvasNodeType =
  | "rectangle"
  | "diamond"
  | "circle"
  | "arrow"
  | "line"
  | "draw"
  | "text"
  | "sticky"
  | "service"
  | "database"
  | "process";

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  sublabel?: string;
  color?: string; // "indigo", "emerald", "amber", "rose", "sky", "purple", "zinc", "yellow", "black"
  fillColor?: string; // "transparent", "tint", "solid"
  strokeWidth?: number; // 1, 2, 4
  strokeStyle?: "solid" | "dashed" | "dotted";
  icon?: string;
  points?: { x: number; y: number }[]; // for freehand paths or multi-point lines
  fromNodeId?: string;
  toNodeId?: string;
}

export interface CanvasConnector {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style?: "solid" | "dashed";
  color?: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface CanvasDocument {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  content: string; // Notes
  canvas_data: CanvasData;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type ViewMode = "split" | "notes" | "canvas";
