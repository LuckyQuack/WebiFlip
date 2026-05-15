export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface HistoryState {
  undoCount: number;
  redoCount: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface HistoryAction {
  before: ImageData;
  after?: ImageData;
  timestamp: number;
}

export interface HistoryFullState {
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
  pendingAction: HistoryAction | null;
}

export interface BoardPost {
  id: string;
  title: string;
  caption: string;
  author: string;
  gifUrl: string;
  posterFrameUrl: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  createdAt: string;
}

export interface GifExportResult {
  blob: Blob;
  frameCount: number;
  lastDrawnFrame: number;
  width: number;
  height: number;
  fps: number;
}

export interface PendingBoardExport extends GifExportResult {
  previewUrl: string;
}

export interface CreateBoardPostOptions {
  gifBlob: Blob;
  title: string;
  author: string;
  caption: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
}

export type DrawingTool = 'brush' | 'eraser';
