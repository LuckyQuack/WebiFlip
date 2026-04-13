import React, { useEffect, useRef } from 'react';
import { stampLine, drawPressureLine } from '../utils/drawingEngine';
import HistoryManager from '../utils/historyManager';

const Canvas = React.forwardRef(({ tool = 'brush', brushColor, canvasHeight, canvasWidth, brushRadius, onHistoryStateChange }, ref) => {
  const canvasRef = useRef(null);
  const onionSkinCanvasRef = useRef(null);
  const contextRef = useRef(null);
  const onionSkinContextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef(null);
  const lastPressureRef = useRef(1);
  const activePointersRef = useRef(new Set());
  const pointerDataRef = useRef(new Map());
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

  const renderCurrentFrame = (imageData) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.globalAlpha = 1.0;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!imageData) return;
    context.putImageData(imageData, 0, 0);
  };

  const renderOnionSkin = (imageData, enabled) => {
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
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const onionCanvas = onionSkinCanvasRef.current;
    if (!canvas || !onionCanvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    onionCanvas.width = canvasWidth;
    onionCanvas.height = canvasHeight;

    const context = canvas.getContext('2d');
    const onionSkinContext = onionCanvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
    onionSkinContextRef.current = onionSkinContext;

    renderCurrentFrame(frameStateRef.current);
    renderOnionSkin(onionSkinStateRef.current.imageData, onionSkinStateRef.current.enabled);
  }, [canvasWidth, canvasHeight]);

  // Update context properties without resetting the canvas
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;

    context.lineWidth = brushRadius;
    context.strokeStyle = brushColor;
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  }, [brushRadius, brushColor, tool]);

  const getCanvasPos = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
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

  const startDrawing = (e) => {
    if (e.pointerType === 'touch' && activePointersRef.current.size > 0) {
      return;
    }

    // Begin history action phase (capture "before" snapshot)
    if (activePointersRef.current.size === 0) {
      ref.current?.historyManager.beginAction(canvasRef.current);
    }

    activePointersRef.current.add(e.pointerId);
    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    
    const pointerPressure = e.pressure || 1;
    pointerDataRef.current.set(e.pointerId, { lastX: x, lastY: y, pressure: pointerPressure });
    
    try {
      canvasRef.current.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if capture fails
    }

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    isDrawingRef.current = true;
    lastPosRef.current = { x, y };
    lastPressureRef.current = pointerPressure;
    
    updateCursorDot(e.clientX, e.clientY);
  };

  const draw = (e) => {
    // Update cursor dot for both drawing and hovering
    updateCursorDot(e.clientX, e.clientY);

    if (!isDrawingRef.current || !activePointersRef.current.has(e.pointerId)) return;

    // Mark history action as dirty (something changed)
    ref.current?.historyManager.markDirty();

    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    const currentPressure = e.pressure || 1;

    const pointerData = pointerDataRef.current.get(e.pointerId);
    if (!pointerData) return;

    const lastPressure = pointerData.pressure;
    pointerData.pressure = currentPressure;
    pointerData.lastX = x;
    pointerData.lastY = y;

    if (lastPosRef.current) {
      const drawColor = tool === 'eraser' ? '#000000' : brushColor;
      drawPressureLine(
        contextRef.current,
        lastPosRef.current.x,
        lastPosRef.current.y,
        x,
        y,
        brushRadius,
        lastPressure,
        currentPressure,
        drawColor,
        1
      );
    }

    lastPosRef.current = { x, y };
    lastPressureRef.current = currentPressure;
  };

  const stopDrawing = (e) => {
    activePointersRef.current.delete(e.pointerId);
    pointerDataRef.current.delete(e.pointerId);

    if (activePointersRef.current.size === 0) {
      contextRef.current.closePath();
      isDrawingRef.current = false;
      lastPosRef.current = null;
      lastPressureRef.current = 1;
      
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
    } catch (err) {
      // Ignore if release fails
    }
  };

  const handlePointerLeave = (e) => {
    hideCursorDot();
    stopDrawing(e);
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
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={stopDrawing}
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
