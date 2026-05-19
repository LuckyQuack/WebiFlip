import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import type { CanvasHandle } from '../Components/Canvas';
import type { HistoryState } from '../types';

interface UseFrameManagerProps {
  currentFrame: number;
  onionSkinEnabled: boolean;
  canvasRef: RefObject<CanvasHandle>;
  frameStatesRef: MutableRefObject<Record<number, ImageData | null>>;
  onHistoryStateChange: (state: HistoryState) => void;
}

interface UseFrameManagerReturn {
  thumbnailVersion: number;
  saveCurrentFrameState: () => void;
  getOnionSkinData: (frame: number) => ImageData | null;
  copyCurrentFrameToNext: (totalFrames: number) => boolean;
}

export const useFrameManager = ({
  currentFrame,
  onionSkinEnabled,
  canvasRef,
  frameStatesRef,
  onHistoryStateChange,
}: UseFrameManagerProps): UseFrameManagerReturn => {
  const frameHistoryRef = useRef<Record<number, ReturnType<CanvasHandle['historyManager']['getFullState']>>>({});
  const previousFrameRef = useRef(1);
  const [thumbnailVersion, setThumbnailVersion] = useState(0);

  const getPreviousFrameIndex = useCallback((frame: number): number | null => {
    return frame > 1 ? frame - 1 : null;
  }, []);

  const getOnionSkinData = useCallback((frame: number): ImageData | null => {
    const prev = getPreviousFrameIndex(frame);
    return prev !== null ? (frameStatesRef.current[prev] ?? null) : null;
  }, [getPreviousFrameIndex, frameStatesRef]);

  const saveCurrentFrameState = useCallback(() => {
    if (!canvasRef.current?.captureFrameState) return;
    frameStatesRef.current[currentFrame] = canvasRef.current.captureFrameState() ?? null;
    setThumbnailVersion((v) => v + 1);
  }, [canvasRef, currentFrame, frameStatesRef]);

  // Save previous frame and load new frame when currentFrame changes
  useEffect(() => {
    if (!canvasRef.current) return;
    if (previousFrameRef.current === currentFrame) return;

    const frameToSave = previousFrameRef.current;
    const frameToLoad = currentFrame;

    if (canvasRef.current.captureFrameState) {
      frameStatesRef.current[frameToSave] = canvasRef.current.captureFrameState() ?? null;
    }
    if (canvasRef.current.historyManager?.getFullState) {
      frameHistoryRef.current[frameToSave] = canvasRef.current.historyManager.getFullState();
    }
    setThumbnailVersion((v) => v + 1);

    if (canvasRef.current.loadFrameState) {
      canvasRef.current.loadFrameState(
        frameStatesRef.current[frameToLoad] ?? null,
        getOnionSkinData(frameToLoad),
        onionSkinEnabled
      );
      if (canvasRef.current.historyManager?.restoreFullState) {
        canvasRef.current.historyManager.restoreFullState(frameHistoryRef.current[frameToLoad] ?? null);
      }
      onHistoryStateChange(canvasRef.current.historyManager.getState());
    }

    previousFrameRef.current = frameToLoad;
  }, [currentFrame, getOnionSkinData, onionSkinEnabled, canvasRef, frameStatesRef, onHistoryStateChange]);

  // Refresh onion skin when toggle changes
  useEffect(() => {
    if (!canvasRef.current?.loadFrameState) return;
    canvasRef.current.loadFrameState(
      frameStatesRef.current[currentFrame] ?? null,
      getOnionSkinData(currentFrame),
      onionSkinEnabled
    );
  }, [onionSkinEnabled, currentFrame, getOnionSkinData, canvasRef, frameStatesRef]);

  const copyCurrentFrameToNext = useCallback((totalFrames: number): boolean => {
    if (currentFrame >= totalFrames) return false;

    // Save current canvas state before copying so the source data is fresh
    if (canvasRef.current?.captureFrameState) {
      frameStatesRef.current[currentFrame] = canvasRef.current.captureFrameState() ?? null;
    }

    const source = frameStatesRef.current[currentFrame];
    frameStatesRef.current[currentFrame + 1] = source
      ? new ImageData(new Uint8ClampedArray(source.data), source.width, source.height)
      : null;

    // Clear stale undo history for the overwritten frame
    delete frameHistoryRef.current[currentFrame + 1];

    setThumbnailVersion((v) => v + 1);
    return true;
  }, [currentFrame, canvasRef, frameStatesRef]);

  return { thumbnailVersion, saveCurrentFrameState, getOnionSkinData, copyCurrentFrameToNext };
};
