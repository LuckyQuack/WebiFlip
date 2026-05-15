import type { HistoryAction, HistoryFullState, HistoryState } from '../types';

const HISTORY_LIMIT = 50;

export class HistoryManager {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private pendingAction: HistoryAction | null = null;
  private isDirty = false;

  beginAction(canvas: HTMLCanvasElement | null): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    this.pendingAction = {
      before: ctx.getImageData(0, 0, canvas.width, canvas.height),
      timestamp: Date.now(),
    };
    this.isDirty = false;
  }

  markDirty(): void {
    this.isDirty = true;
  }

  commitAction(canvas: HTMLCanvasElement | null): boolean {
    if (!this.pendingAction || !this.isDirty || !canvas) {
      this.pendingAction = null;
      this.isDirty = false;
      return false;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.pendingAction = null;
      this.isDirty = false;
      return false;
    }

    const action: HistoryAction = {
      ...this.pendingAction,
      after: ctx.getImageData(0, 0, canvas.width, canvas.height),
    };

    this.undoStack.push(action);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();

    this.redoStack = [];
    this.pendingAction = null;
    this.isDirty = false;
    return true;
  }

  cancelAction(): void {
    this.pendingAction = null;
    this.isDirty = false;
  }

  undo(canvas: HTMLCanvasElement | null): boolean {
    if (!canvas) return false;
    if (this.pendingAction) this.commitAction(canvas);
    if (this.undoStack.length === 0) return false;

    const action = this.undoStack.pop()!;
    this.redoStack.push(action);
    this.applySnapshot(canvas, action.before);
    return true;
  }

  redo(canvas: HTMLCanvasElement | null): boolean {
    if (!canvas) return false;
    if (this.pendingAction) this.commitAction(canvas);
    if (this.redoStack.length === 0) return false;

    const action = this.redoStack.pop()!;
    this.undoStack.push(action);
    this.applySnapshot(canvas, action.after!);
    return true;
  }

  private applySnapshot(canvas: HTMLCanvasElement, imageData: ImageData): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.pendingAction = null;
    this.isDirty = false;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getState(): HistoryState {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }

  getFullState(): HistoryFullState {
    return {
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pendingAction: this.pendingAction,
    };
  }

  restoreFullState(state: HistoryFullState | null): void {
    if (!state) {
      this.clear();
      return;
    }
    this.undoStack = state.undoStack || [];
    this.redoStack = state.redoStack || [];
    this.pendingAction = state.pendingAction || null;
    this.isDirty = false;
  }
}

export default HistoryManager;
