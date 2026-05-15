import { describe, expect, it, beforeEach, vi } from 'vitest';
import { HistoryManager } from '../utils/historyManager';

// jsdom doesn't implement canvas.getContext(), so we stub it.
// HistoryManager only uses: getImageData, putImageData, clearRect.
const makeImageData = (width = 4, height = 4): ImageData => ({
  data: new Uint8ClampedArray(width * height * 4),
  width,
  height,
  colorSpace: 'srgb',
} as ImageData);

const makeCanvas = (width = 4, height = 4): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = {
    getImageData: vi.fn(() => makeImageData(width, height)),
    putImageData: vi.fn(),
    clearRect: vi.fn(),
    fillStyle: '',
    fillRect: vi.fn(),
  };
  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

  return canvas;
};

describe('HistoryManager', () => {
  let manager: HistoryManager;

  beforeEach(() => {
    manager = new HistoryManager();
  });

  describe('initial state', () => {
    it('starts with empty undo and redo stacks', () => {
      const state = manager.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.undoCount).toBe(0);
      expect(state.redoCount).toBe(0);
    });

    it('undo on empty stack returns false', () => {
      expect(manager.undo(makeCanvas())).toBe(false);
    });

    it('redo on empty stack returns false', () => {
      expect(manager.redo(makeCanvas())).toBe(false);
    });
  });

  describe('commitAction', () => {
    it('returns false when no beginAction was called', () => {
      expect(manager.commitAction(makeCanvas())).toBe(false);
    });

    it('returns false when beginAction was called but canvas was never marked dirty', () => {
      const canvas = makeCanvas();
      manager.beginAction(canvas);
      expect(manager.commitAction(canvas)).toBe(false);
    });

    it('returns true and enables undo after a dirty action', () => {
      const canvas = makeCanvas();
      manager.beginAction(canvas);
      manager.markDirty();
      expect(manager.commitAction(canvas)).toBe(true);
      expect(manager.getState().canUndo).toBe(true);
    });

    it('clears redo stack on new commit', () => {
      const canvas = makeCanvas();
      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);

      manager.undo(canvas);
      expect(manager.getState().canRedo).toBe(true);

      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);
      expect(manager.getState().canRedo).toBe(false);
    });
  });

  describe('undo / redo', () => {
    it('undo calls putImageData with the before snapshot', () => {
      const canvas = makeCanvas();
      const ctx = canvas.getContext('2d') as unknown as { putImageData: ReturnType<typeof vi.fn> };
      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);

      manager.undo(canvas);
      expect(ctx.putImageData).toHaveBeenCalled();
    });

    it('redo calls putImageData with the after snapshot', () => {
      const canvas = makeCanvas();
      const ctx = canvas.getContext('2d') as unknown as { putImageData: ReturnType<typeof vi.fn> };
      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);

      manager.undo(canvas);
      manager.redo(canvas);
      expect(ctx.putImageData).toHaveBeenCalledTimes(2);
    });

    it('undo then redo leaves canUndo=true canRedo=false', () => {
      const canvas = makeCanvas();
      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);

      manager.undo(canvas);
      manager.redo(canvas);

      expect(manager.getState().canUndo).toBe(true);
      expect(manager.getState().canRedo).toBe(false);
    });

    it('stacks multiple commits correctly', () => {
      const canvas = makeCanvas();
      for (let i = 0; i < 3; i++) {
        manager.beginAction(canvas);
        manager.markDirty();
        manager.commitAction(canvas);
      }
      expect(manager.getState().undoCount).toBe(3);
    });
  });

  describe('clear', () => {
    it('resets all stacks', () => {
      const canvas = makeCanvas();
      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);
      manager.clear();

      const state = manager.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.undoCount).toBe(0);
      expect(state.redoCount).toBe(0);
    });
  });

  describe('getFullState / restoreFullState', () => {
    it('round-trips full state correctly', () => {
      const canvas = makeCanvas();
      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);

      const snapshot = manager.getFullState();
      const fresh = new HistoryManager();
      fresh.restoreFullState(snapshot);

      expect(fresh.getState().undoCount).toBe(1);
      expect(fresh.getState().canUndo).toBe(true);
    });

    it('restoreFullState(null) behaves like clear', () => {
      const canvas = makeCanvas();
      manager.beginAction(canvas);
      manager.markDirty();
      manager.commitAction(canvas);
      manager.restoreFullState(null);
      expect(manager.getState().canUndo).toBe(false);
    });
  });

  describe('null canvas safety', () => {
    it('beginAction with null canvas does not throw', () => {
      expect(() => manager.beginAction(null)).not.toThrow();
    });

    it('commitAction with null canvas returns false', () => {
      manager.beginAction(makeCanvas());
      manager.markDirty();
      expect(manager.commitAction(null)).toBe(false);
    });

    it('undo with null canvas returns false', () => {
      expect(manager.undo(null)).toBe(false);
    });

    it('redo with null canvas returns false', () => {
      expect(manager.redo(null)).toBe(false);
    });
  });
});
