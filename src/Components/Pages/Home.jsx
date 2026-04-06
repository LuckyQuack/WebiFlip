import React, { useState, useRef, useEffect } from 'react';
import Controls from '../Controls';
import Canvas from '../Canvas';
import './Home.css';

const Home = () => {
  const canvasProperties = {
    brushColor: 'lightblue',
    canvasHeight: 550,
    canvasWidth: 550,
    brushRadius: 5,
  };

  const [brushRadius, setBrushRadius] = useState(canvasProperties.brushRadius);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const canvasRef = useRef(null);

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z or Ctrl+Y (redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey && e.key.toLowerCase() === 'z' && e.shiftKey) || 
                 (e.ctrlKey && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleHistoryStateChange = () => {
    if (canvasRef.current && canvasRef.current.getHistoryState) {
      const state = canvasRef.current.getHistoryState();
      setHistoryState(state);
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (canvasRef.current) {
      canvasRef.current.redo();
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  };

  const handleIncreaseBrush = () => {
    setBrushRadius((prev) => Math.min(prev + 1, 50));
  };

  const handleDecreaseBrush = () => {
    setBrushRadius((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="home-container">
      <Controls
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        brushRadius={brushRadius}
        onIncreaseBrush={handleIncreaseBrush}
        onDecreaseBrush={handleDecreaseBrush}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
      />
      <Canvas
        ref={canvasRef}
        brushColor={canvasProperties.brushColor}
        canvasHeight={canvasProperties.canvasHeight}
        canvasWidth={canvasProperties.canvasWidth}
        brushRadius={brushRadius}
        onHistoryStateChange={handleHistoryStateChange}
      />
    </div>
  );
};

export default Home;
