import React, { useEffect, useRef } from 'react';
import { drawPressureLine } from '../utils/drawingEngine';
import HistoryManager from '../utils/historyManager';

const Canvas = React.forwardRef(({ tool = 'brush', brushColor, canvasHeight, canvasWidth, brushRadius, onHistoryStateChange }, ref) => {
  const canvasRef = useRef(null);
  const onionSkinCanvasRef = useRef(null);
  const contextRef = useRef(null);
  const onionSkinContextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const activePointersRef = useRef(new Set());
  const pointerDataRef = useRef(new Map());
  const pressedPointersRef = useRef(new Map());
  const cursorDotRef = useRef(null);
  const historyManagerRef = useRef(new HistoryManager());
  const frameStateRef = useRef(null);
  const onionSkinStateRef = useRef({
    enabled: false,
    imageData: null,
  });
  const offscreenCanvasRef = useRef(document.createElement('canvas'));

  // Helper to check if ImageData has any visible content
  const hasContent = (imageData) => {
    if (!imageData) return false;
    const data = imageData.data;
    // Check if any pixel has alpha > 0 (has some content)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  };

  const drawImageDataWithAlpha = (context, imageData, alpha) => {
    if (!imageData) return;
    const offscreen = offscreenCanvasRef.current;
    offscreen.width = imageData.width;
    offscreen.height = imageData.height;
    const offscreenCtx = offscreen.getContext('2d');
    offscreenCtx.putImageData(imageData, 0, 0);
    context.globalAlpha = alpha;
    context.drawImage(offscreen, 0, 0);
    context.globalAlpha = 1.0;
  };

  const captureCurrentFrameState = () => {
    if (!contextRef.current || !canvasRef.current) return null;
    return contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const renderCurrentFrame = React.useCallback((imageData) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.globalAlpha = 1.0;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!imageData) return;
    context.putImageData(imageData, 0, 0);
  }, []);

  const renderOnionSkin = React.useCallback((imageData, enabled) => {
    const canvas = onionSkinCanvasRef.current;
    const context = onionSkinContextRef.current;
    if (!canvas || !context) return;

    onionSkinStateRef.current = {
      enabled,
      imageData,
    };

    context.globalAlpha = 1.0;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (enabled && hasContent(imageData)) {
      drawImageDataWithAlpha(context, imageData, 0.5);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const onionCanvas = onionSkinCanvasRef.current;
    if (!canvas || !onionCanvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    onionCanvas.width = canvasWidth;
    onionCanvas.height = canvasHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    const onionSkinContext = onionCanvas.getContext('2d', { willReadFrequently: true });
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
    onionSkinContextRef.current = onionSkinContext;

    renderCurrentFrame(frameStateRef.current);
    renderOnionSkin(onionSkinStateRef.current.imageData, onionSkinStateRef.current.enabled);
  }, [canvasWidth, canvasHeight, renderCurrentFrame, renderOnionSkin]);

  const resetActiveStroke = React.useCallback(() => {
    activePointersRef.current.forEach((pointerId) => {
      try {
        canvasRef.current?.releasePointerCapture(pointerId);
      } catch {
        // Pointer capture may already be gone after tablet driver cancellation.
      }
    });

    activePointersRef.current.clear();
    pointerDataRef.current.clear();
    pressedPointersRef.current.clear();
    isDrawingRef.current = false;
    historyManagerRef.current.cancelAction();
    hideCursorDot();
  }, []);

  // Update context properties without resetting the canvas
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;

    resetActiveStroke();
    context.lineWidth = brushRadius;
    context.strokeStyle = brushColor;
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  }, [brushRadius, brushColor, resetActiveStroke, tool]);

  const getCanvasPos = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const isPointInsideCanvas = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  const updateCursorDot = (clientX, clientY) => {
    if (!cursorDotRef.current) return;
    cursorDotRef.current.style.left = `${clientX}px`;
    cursorDotRef.current.style.top = `${clientY}px`;
    cursorDotRef.current.style.display = 'block';
  };

  const hideCursorDot = () => {
    if (cursorDotRef.current) {
      cursorDotRef.current.style.display = 'none';
    }
  };

  const getPointerPressure = (e) => {
    if (typeof e.pressure === 'number' && e.pressure > 0) {
      return e.pressure;
    }

    return e.pointerType === 'pen' ? 0.35 : 1;
  };

  const isPrimaryPointerButtonDown = (e) => {
    if (e.pointerType === 'pen') {
      return e.buttons !== 0 || e.pressure > 0;
    }

    if (e.pointerType === 'touch') {
      return e.buttons === 0 || (e.buttons & 1) === 1;
    }

    return (e.buttons & 1) === 1;
  };

  const shouldKeepTrackingPointer = (e, pressedPointer) => {
    if (e.pointerType === 'pen' || e.pointerType === 'touch') {
      return !!pressedPointer;
    }

    return isPrimaryPointerButtonDown(e);
  };

  const drawStrokeSegment = (fromX, fromY, toX, toY, fromPressure, toPressure) => {
    const drawColor = tool === 'eraser' ? '#000000' : brushColor;
    drawPressureLine(
      contextRef.current,
      fromX,
      fromY,
      toX,
      toY,
      brushRadius,
      fromPressure,
      toPressure,
      drawColor,
      1
    );
  };

  const startDrawing = (e, initialPoint = null) => {
    e.preventDefault();

    if (e.pointerType === 'touch' && activePointersRef.current.size > 0) {
      return;
    }

    // Begin history action phase (capture "before" snapshot)
    if (activePointersRef.current.size === 0) {
      ref.current?.historyManager.beginAction(canvasRef.current);
    }

    activePointersRef.current.add(e.pointerId);
    const { x, y } = initialPoint ?? getCanvasPos(e.clientX, e.clientY);
    
    const pointerPressure = getPointerPressure(e);
    pointerDataRef.current.set(e.pointerId, { lastX: x, lastY: y, pressure: pointerPressure });
    
    try {
      canvasRef.current.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if capture fails
    }

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    isDrawingRef.current = true;

    ref.current?.historyManager.markDirty();
    drawStrokeSegment(x, y, x, y, pointerPressure, pointerPressure);
    
    updateCursorDot(e.clientX, e.clientY);
  };

  const draw = (e) => {
    e.preventDefault();

    // Update cursor dot for both drawing and hovering
    updateCursorDot(e.clientX, e.clientY);

    if (!isDrawingRef.current || !activePointersRef.current.has(e.pointerId)) {
      if (isPrimaryPointerButtonDown(e)) {
        const pressedPointer = pressedPointersRef.current.get(e.pointerId);
        const previousPoint = pressedPointer
          ? getCanvasPos(pressedPointer.previousClientX, pressedPointer.previousClientY)
          : getCanvasPos(
              e.clientX - (e.movementX || 0),
              e.clientY - (e.movementY || 0)
            );
        startDrawing(e, previousPoint);
      }

      if (!isDrawingRef.current || !activePointersRef.current.has(e.pointerId)) return;
    }

    // Mark history action as dirty (something changed)
    ref.current?.historyManager.markDirty();

    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    const currentPressure = getPointerPressure(e);

    const pointerData = pointerDataRef.current.get(e.pointerId);
    if (!pointerData) return;

    const lastPressure = pointerData.pressure;
    const lastX = pointerData.lastX;
    const lastY = pointerData.lastY;
    pointerData.pressure = currentPressure;
    pointerData.lastX = x;
    pointerData.lastY = y;

    drawStrokeSegment(lastX, lastY, x, y, lastPressure, currentPressure);
  };

  const stopDrawing = (e) => {
    e.preventDefault();

    if (!activePointersRef.current.has(e.pointerId)) {
      hideCursorDot();
      return;
    }

    activePointersRef.current.delete(e.pointerId);
    pointerDataRef.current.delete(e.pointerId);

    if (activePointersRef.current.size === 0) {
      contextRef.current.closePath();
      isDrawingRef.current = false;
      
      // Commit history action phase (capture "after" snapshot)
      ref.current?.historyManager.commitAction(canvasRef.current);
      
      // Save frame state immediately after drawing completes
      if (ref.current?.saveFrameState && canvasRef.current) {
        const frameState = captureCurrentFrameState();
        ref.current.saveFrameState(frameState);
      }
      
      // Notify parent of history state change
      ref.current?.onHistoryStateChange?.();
      
      hideCursorDot();
    }

    try {
      canvasRef.current.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if release fails
    }
  };

  useEffect(() => {
    const trackPointerDown = (e) => {
      if (e.pointerType === 'mouse' && !isPrimaryPointerButtonDown(e)) return;

      pressedPointersRef.current.set(e.pointerId, {
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        previousClientX: e.clientX,
        previousClientY: e.clientY,
      });
    };

    const trackPointerMove = (e) => {
      let pressedPointer = pressedPointersRef.current.get(e.pointerId);

      if (!shouldKeepTrackingPointer(e, pressedPointer)) {
        pressedPointersRef.current.delete(e.pointerId);
        return;
      }

      e.preventDefault();

      if (!pressedPointer) {
        trackPointerDown(e);
        pressedPointer = pressedPointersRef.current.get(e.pointerId);
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

    const clearPointer = (e) => {
      pressedPointersRef.current.delete(e.pointerId);
      stopDrawing(e);
    };

    const listenerOptions = { capture: true, passive: false };

    window.addEventListener('pointerdown', trackPointerDown, listenerOptions);
    window.addEventListener('pointermove', trackPointerMove, listenerOptions);
    window.addEventListener('pointerrawupdate', trackPointerMove, listenerOptions);
    window.addEventListener('pointerup', clearPointer, listenerOptions);
    window.addEventListener('pointercancel', clearPointer, listenerOptions);

    return () => {
      window.removeEventListener('pointerdown', trackPointerDown, listenerOptions);
      window.removeEventListener('pointermove', trackPointerMove, listenerOptions);
      window.removeEventListener('pointerrawupdate', trackPointerMove, listenerOptions);
      window.removeEventListener('pointerup', clearPointer, listenerOptions);
      window.removeEventListener('pointercancel', clearPointer, listenerOptions);
    };
  });

  const handlePointerLeave = (e) => {
    hideCursorDot();

    if (activePointersRef.current.has(e.pointerId)) {
      stopDrawing(e);
    }
  };

  const handlePointerEnter = (e) => {
    updateCursorDot(e.clientX, e.clientY);

    if (isDrawingRef.current || activePointersRef.current.has(e.pointerId)) return;
    if (!isPrimaryPointerButtonDown(e) || !pressedPointersRef.current.has(e.pointerId)) return;

    const pressedPointer = pressedPointersRef.current.get(e.pointerId);
    startDrawing(e, getCanvasPos(pressedPointer.previousClientX, pressedPointer.previousClientY));
    draw(e);
  };

  React.useImperativeHandle(ref, () => ({
    historyManager: historyManagerRef.current,
    onHistoryStateChange: onHistoryStateChange,
    undo: () => {
      const result = historyManagerRef.current.undo(canvasRef.current);
      if (result) {
        frameStateRef.current = captureCurrentFrameState();
        if (onHistoryStateChange) {
          onHistoryStateChange();
        }
      }
      return result;
    },
    redo: () => {
      const result = historyManagerRef.current.redo(canvasRef.current);
      if (result) {
        frameStateRef.current = captureCurrentFrameState();
        if (onHistoryStateChange) {
          onHistoryStateChange();
        }
      }
      return result;
    },
    clear: () => {
      const canvas = canvasRef.current;
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
      historyManagerRef.current.clear();
      frameStateRef.current = null;
      renderOnionSkin(onionSkinStateRef.current.imageData, onionSkinStateRef.current.enabled);
      if (onHistoryStateChange) {
        onHistoryStateChange();
      }
    },
    getCanvas: () => canvasRef.current,
    getHistoryState: () => historyManagerRef.current.getState(),
    captureFrameState: () => {
      return frameStateRef.current;
    },
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
        onPointerDown={startDrawing}
        onPointerEnter={handlePointerEnter}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={stopDrawing}
        onLostPointerCapture={stopDrawing}
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
      {/* Cursor dot that follows the pointer */}
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
          boxShadow: `0 0 0 1px rgba(0,0,0,0.3)`,
          zIndex: 1000,
        }}
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
