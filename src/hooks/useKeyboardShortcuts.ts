import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { CanvasHandle } from '../Components/Canvas';
import type { DrawingTool } from '../types';

interface UseKeyboardShortcutsProps {
  isActive: boolean;
  isPostDialogOpen: boolean;
  canvasRef: RefObject<CanvasHandle>;
  onSetTool: (tool: DrawingTool) => void;
  onTogglePlay: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onToggleOnionSkin: () => void;
}

export const useKeyboardShortcuts = ({
  isActive,
  isPostDialogOpen,
  canvasRef,
  onSetTool,
  onTogglePlay,
  onMoveLeft,
  onMoveRight,
  onToggleOnionSkin,
}: UseKeyboardShortcutsProps): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || isPostDialogOpen) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const bare = !ctrl && !e.altKey;

      const isUndo = ctrl && key === 'z';
      const isRedo = ctrl && key === 'y';
      const isTool = bare && (key === 'p' || key === 'e');
      const isPlay = bare && e.code === 'Space';
      const isFrame = bare && (e.key === 'ArrowLeft' || e.key === 'ArrowRight');
      const isOnion = bare && key === 'o';

      if (!isUndo && !isRedo && !isTool && !isPlay && !isFrame && !isOnion) return;

      e.preventDefault();

      if (isUndo) canvasRef.current?.undo();
      else if (isRedo) canvasRef.current?.redo();
      else if (isTool) onSetTool(key === 'p' ? 'brush' : 'eraser');
      else if (isPlay && !e.repeat) onTogglePlay();
      else if (isFrame) {
        if (e.key === 'ArrowLeft') onMoveLeft();
        else onMoveRight();
      } else if (isOnion && !e.repeat) onToggleOnionSkin();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isPostDialogOpen, canvasRef, onSetTool, onTogglePlay, onMoveLeft, onMoveRight, onToggleOnionSkin]);
};
