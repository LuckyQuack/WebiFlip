/**
 * History Manager - Celstomp-inspired undo/redo system
 * Uses full canvas snapshots with two-stack approach
 */

const HISTORY_LIMIT = 50;

class HistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.pendingAction = null;
    this.isDirty = false;
  }

  /**
   * Begin capturing a new action
   * Stores the "before" state snapshot
   */
  beginAction(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    this.pendingAction = {
      before: imageData,
      timestamp: Date.now(),
    };

    this.isDirty = false;
  }

  /**
   * Mark action as modified
   * Called whenever pixels change during the action
   */
  markDirty() {
    this.isDirty = true;
  }

  /**
   * Commit the action to undo stack
   * Stores the "after" state snapshot
   */
  commitAction(canvas) {
    if (!this.pendingAction || !this.isDirty) {
      this.pendingAction = null;
      return;
    }

    if (!canvas) {
      this.pendingAction = null;
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const action = {
      ...this.pendingAction,
      after: imageData,
    };

    this.undoStack.push(action);

    // Enforce history limit
    if (this.undoStack.length > HISTORY_LIMIT) {
      this.undoStack.shift();
    }

    // Clear redo stack on new action (celstomp behavior)
    this.redoStack = [];
    this.pendingAction = null;
    this.isDirty = false;
  }

  /**
   * Cancel the pending action without saving
   */
  cancelAction() {
    this.pendingAction = null;
    this.isDirty = false;
  }

  /**
   * Undo the last action
   */
  undo(canvas) {
    if (this.undoStack.length === 0 || !canvas) return false;

    // If there's a pending action, finalize it first
    if (this.pendingAction) {
      this.commitAction(canvas);
    }

    const action = this.undoStack.pop();
    this.redoStack.push(action);

    // Restore the "before" state
    this.applySnapshot(canvas, action.before);
    return true;
  }

  /**
   * Redo the last undone action
   */
  redo(canvas) {
    if (this.redoStack.length === 0 || !canvas) return false;

    const action = this.redoStack.pop();
    this.undoStack.push(action);

    // Apply the "after" state
    this.applySnapshot(canvas, action.after);
    return true;
  }

  /**
   * Apply a snapshot to the canvas
   */
  applySnapshot(canvas, imageData) {
    if (!canvas || !imageData) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.pendingAction = null;
    this.isDirty = false;
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get current history state (for UI updates)
   */
  getState() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }

  /**
   * Save full history state for frame persistence
   */
  getFullState() {
    return {
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pendingAction: this.pendingAction,
    };
  }

  /**
   * Restore full history state from saved frame
   */
  restoreFullState(state) {
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
