import React, { useCallback, useEffect, useRef } from 'react';
import { drawPressureLine } from '../utils/drawingEngine';
import { HistoryManager } from '../utils/historyManager';
import type { DrawingTool, HistoryState } from '../types';

export interface CanvasHandle {
  historyManager: HistoryManager;
  onHistoryStateChange: (() => void) | undefined;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  getHistoryState: () => HistoryState;
  captureFrameState: () => ImageData | null;
  loadFrameState: (imageData: ImageData | null, onionSkinImageData: ImageData | null, onionSkinEnabled: boolean) => void;
  saveFrameState: (imageData: ImageData | null) => void;
}

interface CanvasProps {
  tool: DrawingTool;
  brushColor: string;
  canvasHeight: number;
  canvasWidth: number;
  brushRadius: number;
  onHistoryStateChange?: () => void;
}

interface PointerData {
  lastX: number;
  lastY: number;
  pressure: number;
}

interface PressedPointer {
  lastClientX: number;
  lastClientY: number;
  previousClientX: number;
  previousClientY: number;
}

const Canvas = React.forwardRef<CanvasHandle, CanvasProps>(
  ({ tool, brushColor, canvasHeight, canvasWidth, brushRadius, onHistoryStateChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const onionSkinCanvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const onionSkinContextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const activePointersRef = useRef(new Set<number>());
    const pointerDataRef = useRef(new Map<number, PointerData>());
    const pressedPointersRef = useRef(new Map<number, PressedPointer>());
    const cursorDotRef = useRef<HTMLDivElement>(null);
    const historyManagerRef = useRef(new HistoryManager());
    const frameStateRef = useRef<ImageData | null>(null);
    const onHistoryStateChangeRef = useRef(onHistoryStateChange);
    const onionSkinStateRef = useRef({ enabled: false, imageData: null as ImageData | null });
    const offscreenCanvasRef = useRef(document.createElement('canvas'));

    const drawImageDataWithAlpha = (context: CanvasRenderingContext2D, imageData: ImageData, alpha: number) => {
      const offscreen = offscreenCanvasRef.current;
      offscreen.width = imageData.width;
      offscreen.height = imageData.height;
      offscreen.getContext('2d')!.putImageData(imageData, 0, 0);
      context.globalAlpha = alpha;
      context.drawImage(offscreen, 0, 0);
      context.globalAlpha = 1.0;
    };

    const hasContent = (imageData: ImageData | null | undefined): boolean => {
      if (!imageData) return false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) return true;
      }
      return false;
    };

    const captureCurrentFrameState = (): ImageData | null => {
      if (!contextRef.current || !canvasRef.current) return null;
      return contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const renderCurrentFrame = useCallback((imageData: ImageData | null) => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context) return;
      context.globalAlpha = 1.0;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (imageData) context.putImageData(imageData, 0, 0);
    }, []);

    const renderOnionSkin = useCallback((imageData: ImageData | null, enabled: boolean) => {
      const canvas = onionSkinCanvasRef.current;
      const context = onionSkinContextRef.current;
      if (!canvas || !context) return;

      onionSkinStateRef.current = { enabled, imageData };
      context.globalAlpha = 1.0;
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (enabled && hasContent(imageData)) {
        drawImageDataWithAlpha(context, imageData!, 0.5);
      }
    }, []);

    useEffect(() => {
      onHistoryStateChangeRef.current = onHistoryStateChange;
    }, [onHistoryStateChange]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const onionCanvas = onionSkinCanvasRef.current;
      if (!canvas || !onionCanvas) return;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      onionCanvas.width = canvasWidth;
      onionCanvas.height = canvasHeight;

      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const onionSkinContext = onionCanvas.getContext('2d', { willReadFrequently: true })!;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
      onionSkinContextRef.current = onionSkinContext;

      renderCurrentFrame(frameStateRef.current);
      renderOnionSkin(onionSkinStateRef.current.imageData, onionSkinStateRef.current.enabled);
    }, [canvasWidth, canvasHeight, renderCurrentFrame, renderOnionSkin]);

    const finishActiveStroke = useCallback(() => {
      const didCommit = historyManagerRef.current.commitAction(canvasRef.current);
      if (didCommit && canvasRef.current) {
        frameStateRef.current = captureCurrentFrameState();
        onHistoryStateChangeRef.current?.();
      }
    }, []);

    const hideCursorDot = () => {
      if (cursorDotRef.current) cursorDotRef.current.style.display = 'none';
    };

    const resetActiveStroke = useCallback(() => {
      activePointersRef.current.forEach((pointerId) => {
        try { canvasRef.current?.releasePointerCapture(pointerId); } catch { /* already released */ }
      });
      activePointersRef.current.clear();
      pointerDataRef.current.clear();
      pressedPointersRef.current.clear();
      isDrawingRef.current = false;
      finishActiveStroke();
      hideCursorDot();
    }, [finishActiveStroke]);

    useEffect(() => {
      const context = contextRef.current;
      if (!context) return;
      resetActiveStroke();
      context.lineWidth = brushRadius;
      context.strokeStyle = brushColor;
      context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    }, [brushRadius, brushColor, resetActiveStroke, tool]);

    const getCanvasPos = (clientX: number, clientY: number) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const isPointInsideCanvas = (clientX: number, clientY: number): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    };

    const updateCursorDot = (clientX: number, clientY: number) => {
      if (!cursorDotRef.current) return;
      cursorDotRef.current.style.left = `${clientX}px`;
      cursorDotRef.current.style.top = `${clientY}px`;
      cursorDotRef.current.style.display = 'block';
    };

    const getPointerPressure = (e: PointerEvent): number => {
      if (typeof e.pressure === 'number' && e.pressure > 0) return e.pressure;
      return e.pointerType === 'pen' ? 0.35 : 1;
    };

    const isPrimaryPointerButtonDown = (e: PointerEvent): boolean => {
      if (e.pointerType === 'pen') return e.buttons !== 0 || e.pressure > 0;
      if (e.pointerType === 'touch') return e.buttons === 0 || (e.buttons & 1) === 1;
      return (e.buttons & 1) === 1;
    };

    const shouldKeepTrackingPointer = (e: PointerEvent, pressedPointer: PressedPointer | undefined): boolean => {
      if (e.pointerType === 'pen' || e.pointerType === 'touch') return !!pressedPointer;
      return isPrimaryPointerButtonDown(e);
    };

    const drawStrokeSegment = (fromX: number, fromY: number, toX: number, toY: number, fromPressure: number, toPressure: number) => {
      const drawColor = tool === 'eraser' ? '#000000' : brushColor;
      drawPressureLine(contextRef.current!, fromX, fromY, toX, toY, brushRadius, fromPressure, toPressure, drawColor, 1);
    };

    // Using a ref for the imperative handle so we can reference it in startDrawing/stopDrawing
    const imperativeRef = ref as React.MutableRefObject<CanvasHandle>;

    const startDrawing = (e: PointerEvent, initialPoint?: { x: number; y: number }) => {
      e.preventDefault();
      if (e.pointerType === 'touch' && activePointersRef.current.size > 0) return;

      if (activePointersRef.current.size === 0) {
        imperativeRef?.current?.historyManager?.beginAction(canvasRef.current);
      }

      activePointersRef.current.add(e.pointerId);
      const { x, y } = initialPoint ?? getCanvasPos(e.clientX, e.clientY);
      const pointerPressure = getPointerPressure(e);
      pointerDataRef.current.set(e.pointerId, { lastX: x, lastY: y, pressure: pointerPressure });

      try { canvasRef.current!.setPointerCapture(e.pointerId); } catch { /* ignore */ }

      contextRef.current!.beginPath();
      contextRef.current!.moveTo(x, y);
      isDrawingRef.current = true;

      imperativeRef?.current?.historyManager?.markDirty();
      drawStrokeSegment(x, y, x, y, pointerPressure, pointerPressure);
      updateCursorDot(e.clientX, e.clientY);
    };

    const draw = (e: PointerEvent) => {
      e.preventDefault();
      updateCursorDot(e.clientX, e.clientY);

      if (!isDrawingRef.current || !activePointersRef.current.has(e.pointerId)) {
        if (isPrimaryPointerButtonDown(e)) {
          const pressedPointer = pressedPointersRef.current.get(e.pointerId);
          const previousPoint = pressedPointer
            ? getCanvasPos(pressedPointer.previousClientX, pressedPointer.previousClientY)
            : getCanvasPos(e.clientX - (e.movementX || 0), e.clientY - (e.movementY || 0));
          startDrawing(e, previousPoint);
        }
        if (!isDrawingRef.current || !activePointersRef.current.has(e.pointerId)) return;
      }

      imperativeRef?.current?.historyManager?.markDirty();

      const { x, y } = getCanvasPos(e.clientX, e.clientY);
      const pointerData = pointerDataRef.current.get(e.pointerId);
      if (!pointerData) return;

      const currentPressure = getPointerPressure(e);
      const { lastX, lastY, pressure: lastPressure } = pointerData;
      pointerData.pressure = currentPressure;
      pointerData.lastX = x;
      pointerData.lastY = y;

      drawStrokeSegment(lastX, lastY, x, y, lastPressure, currentPressure);
    };

    const stopDrawing = (e: PointerEvent) => {
      e.preventDefault();
      if (!activePointersRef.current.has(e.pointerId)) {
        hideCursorDot();
        return;
      }

      activePointersRef.current.delete(e.pointerId);
      pointerDataRef.current.delete(e.pointerId);

      if (activePointersRef.current.size === 0) {
        contextRef.current!.closePath();
        isDrawingRef.current = false;
        imperativeRef?.current?.historyManager?.commitAction(canvasRef.current);

        if (imperativeRef?.current?.saveFrameState && canvasRef.current) {
          imperativeRef.current.saveFrameState(captureCurrentFrameState());
        }
        imperativeRef?.current?.onHistoryStateChange?.();
        hideCursorDot();
      }

      try { canvasRef.current!.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };

    useEffect(() => {
      const trackPointerDown = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && !isPrimaryPointerButtonDown(e)) return;
        pressedPointersRef.current.set(e.pointerId, {
          lastClientX: e.clientX,
          lastClientY: e.clientY,
          previousClientX: e.clientX,
          previousClientY: e.clientY,
        });
      };

      const trackPointerMove = (e: PointerEvent) => {
        const pressedPointer = pressedPointersRef.current.get(e.pointerId);
        if (!shouldKeepTrackingPointer(e, pressedPointer)) {
          pressedPointersRef.current.delete(e.pointerId);
          return;
        }

        e.preventDefault();

        if (!pressedPointer) {
          trackPointerDown(e);
          const p = pressedPointersRef.current.get(e.pointerId);
          if (!p) return;
          if (isPointInsideCanvas(e.clientX, e.clientY)) {
            if (!activePointersRef.current.has(e.pointerId)) {
              startDrawing(e, getCanvasPos(p.lastClientX, p.lastClientY));
            }
            draw(e);
          }
          p.previousClientX = p.lastClientX;
          p.previousClientY = p.lastClientY;
          p.lastClientX = e.clientX;
          p.lastClientY = e.clientY;
          return;
        }

        const currentPointIsInside = isPointInsideCanvas(e.clientX, e.clientY);
        if (currentPointIsInside) {
          updateCursorDot(e.clientX, e.clientY);
          if (!activePointersRef.current.has(e.pointerId)) {
            startDrawing(e, getCanvasPos(pressedPointer.lastClientX, pressedPointer.lastClientY));
          }
          draw(e);
        }

        pressedPointer.previousClientX = pressedPointer.lastClientX;
        pressedPointer.previousClientY = pressedPointer.lastClientY;
        pressedPointer.lastClientX = e.clientX;
        pressedPointer.lastClientY = e.clientY;
      };

      const clearPointer = (e: PointerEvent) => {
        pressedPointersRef.current.delete(e.pointerId);
        stopDrawing(e);
      };

      const opts: AddEventListenerOptions = { capture: true, passive: false };
      window.addEventListener('pointerdown', trackPointerDown, opts);
      window.addEventListener('pointermove', trackPointerMove, opts);
      window.addEventListener('pointerrawupdate', trackPointerMove as EventListener, opts);
      window.addEventListener('pointerup', clearPointer, opts);
      window.addEventListener('pointercancel', clearPointer, opts);

      return () => {
        window.removeEventListener('pointerdown', trackPointerDown, opts);
        window.removeEventListener('pointermove', trackPointerMove, opts);
        window.removeEventListener('pointerrawupdate', trackPointerMove as EventListener, opts);
        window.removeEventListener('pointerup', clearPointer, opts);
        window.removeEventListener('pointercancel', clearPointer, opts);
      };
    });

    const handlePointerLeave = (e: React.PointerEvent) => {
      hideCursorDot();
      if (activePointersRef.current.has(e.pointerId)) stopDrawing(e.nativeEvent);
    };

    const handlePointerEnter = (e: React.PointerEvent) => {
      updateCursorDot(e.clientX, e.clientY);
      if (isDrawingRef.current || activePointersRef.current.has(e.pointerId)) return;
      if (!isPrimaryPointerButtonDown(e.nativeEvent) || !pressedPointersRef.current.has(e.pointerId)) return;
      const pressedPointer = pressedPointersRef.current.get(e.pointerId)!;
      startDrawing(e.nativeEvent, getCanvasPos(pressedPointer.previousClientX, pressedPointer.previousClientY));
      draw(e.nativeEvent);
    };

    React.useImperativeHandle(ref, () => ({
      historyManager: historyManagerRef.current,
      onHistoryStateChange,
      undo: () => {
        const result = historyManagerRef.current.undo(canvasRef.current);
        if (result) {
          frameStateRef.current = captureCurrentFrameState();
          onHistoryStateChange?.();
        }
        return result;
      },
      redo: () => {
        const result = historyManagerRef.current.redo(canvasRef.current);
        if (result) {
          frameStateRef.current = captureCurrentFrameState();
          onHistoryStateChange?.();
        }
        return result;
      },
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        contextRef.current!.clearRect(0, 0, canvas.width, canvas.height);
        historyManagerRef.current.clear();
        frameStateRef.current = null;
        renderOnionSkin(onionSkinStateRef.current.imageData, onionSkinStateRef.current.enabled);
        onHistoryStateChange?.();
      },
      getCanvas: () => canvasRef.current,
      getHistoryState: () => historyManagerRef.current.getState(),
      captureFrameState: () => frameStateRef.current,
      loadFrameState: (imageData, onionSkinImageData, onionSkinEnabled) => {
        frameStateRef.current = imageData;
        renderCurrentFrame(imageData);
        renderOnionSkin(onionSkinImageData, onionSkinEnabled);
      },
      saveFrameState: (imageData) => {
        frameStateRef.current = imageData;
      },
    }));

    return (
      <div className="canvas-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={onionSkinCanvasRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            pointerEvents: 'none',
            backgroundColor: '#fff',
          }}
        />
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => startDrawing(e.nativeEvent)}
          onPointerEnter={handlePointerEnter}
          onPointerMove={(e) => draw(e.nativeEvent)}
          onPointerUp={(e) => stopDrawing(e.nativeEvent)}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={(e) => stopDrawing(e.nativeEvent)}
          onLostPointerCapture={(e) => stopDrawing(e.nativeEvent)}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'relative',
            border: '1px solid #ccc',
            cursor: 'none',
            display: 'block',
            backgroundColor: 'transparent',
            touchAction: 'none',
            zIndex: 1,
          }}
        />
        <div
          ref={cursorDotRef}
          style={{
            position: 'fixed',
            width: '6px',
            height: '6px',
            backgroundColor: brushColor,
            borderRadius: '50%',
            pointerEvents: 'none',
            display: 'none',
            transform: 'translate(-3px, -3px)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
            zIndex: 1000,
          }}
        />
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';

export default Canvas;
