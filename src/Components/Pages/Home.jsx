import React, { useState, useRef, useEffect } from 'react';
import Canvas from '../Canvas';
import './Home.css';

const Home = () => {
  const [tool, setTool] = useState('brush');
  const [brushColor, setBrushColor] = useState('#4AA3DF');
  const [brushRadius, setBrushRadius] = useState(8);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(true);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [metaLeft, setMetaLeft] = useState('');
  const [metaRight, setMetaRight] = useState('');
  const [description, setDescription] = useState('');
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const canvasRef = useRef(null);
  const frameStatesRef = useRef({});
  const frameHistoryRef = useRef({});
  const previousFrameRef = useRef(1);
  const frames = Array.from({ length: 30 }, (_, index) => index + 1);

  useEffect(() => {
    if (canvasRef.current && canvasRef.current.getHistoryState) {
      setHistoryState(canvasRef.current.getHistoryState());
    }
  }, []);

  // Handle frame switching - save current frame, load new frame
  useEffect(() => {
    if (!canvasRef.current) return;

    // Only proceed if we're actually switching frames
    if (previousFrameRef.current === currentFrame) return;

    // Save the frame we're leaving
    const frameToSave = previousFrameRef.current;
    const frameToLoad = currentFrame;

    const saveFrame = () => {
      if (canvasRef.current?.captureFrameState) {
        const frameState = canvasRef.current.captureFrameState();
        if (frameState) {
          frameStatesRef.current[frameToSave] = frameState;
        }
      }
      // Save history for this frame
      if (canvasRef.current?.historyManager?.getFullState) {
        const historyState = canvasRef.current.historyManager.getFullState();
        frameHistoryRef.current[frameToSave] = historyState;
      }
    };

    const loadFrame = () => {
      if (canvasRef.current?.loadFrameState) {
        const frameState = frameStatesRef.current[frameToLoad] || null;
        const prevFrameIndex = frameToLoad === 1 ? 30 : frameToLoad - 1;
        const onionSkinData = frameStatesRef.current[prevFrameIndex] || null;
        canvasRef.current.loadFrameState(frameState, onionSkinData, onionSkinEnabled);
        
        // Restore history for this frame
        if (canvasRef.current?.historyManager?.restoreFullState) {
          const historyState = frameHistoryRef.current[frameToLoad] || null;
          canvasRef.current.historyManager.restoreFullState(historyState);
        }
        
        setHistoryState(canvasRef.current.historyManager.getState());
      }
    };

    saveFrame();
    loadFrame();
    previousFrameRef.current = frameToLoad;
  }, [currentFrame, onionSkinEnabled]);

  // Re-render current frame when onion skin toggle changes
  useEffect(() => {
    if (!canvasRef.current?.loadFrameState) return;
    
    const frameState = frameStatesRef.current[currentFrame] || null;
    const prevFrameIndex = currentFrame === 1 ? 30 : currentFrame - 1;
    const onionSkinData = frameStatesRef.current[prevFrameIndex] || null;
    canvasRef.current.loadFrameState(frameState, onionSkinData, onionSkinEnabled);
  }, [onionSkinEnabled]);

  const handleHistoryStateChange = () => {
    if (canvasRef.current && canvasRef.current.getHistoryState) {
      setHistoryState(canvasRef.current.getHistoryState());
    }
    // Auto-save current frame state after any drawing change
    if (canvasRef.current?.captureFrameState) {
      const frameState = canvasRef.current.captureFrameState();
      if (frameState) {
        frameStatesRef.current[currentFrame] = frameState;
      }
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
      frameStatesRef.current[currentFrame] = null;
    }
  };

  const handleBrushSizeChange = (value) => {
    setBrushRadius(value);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();
      const isUndo = (e.ctrlKey || e.metaKey) && key === 'z';
      const isRedo = (e.ctrlKey || e.metaKey) && key === 'y';
      if (!isUndo && !isRedo) {
        return;
      }

      e.preventDefault();
      if (isUndo) {
        if (canvasRef.current) {
          canvasRef.current.undo();
        }
      } else if (isRedo) {
        if (canvasRef.current) {
          canvasRef.current.redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hexToRgb = (hex) => {
    let value = hex.replace('#', '');
    if (value.length === 3) {
      value = value.split('').map((c) => c + c).join('');
    }
    const intValue = parseInt(value, 16);
    return {
      r: (intValue >> 16) & 255,
      g: (intValue >> 8) & 255,
      b: intValue & 255,
    };
  };

  const rgbToHex = ({ r, g, b }) => {
    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const rgbToHsv = ({ r, g, b }) => {
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const delta = max - min;
    let h = 0;

    if (delta > 0) {
      if (max === rr) {
        h = ((gg - bb) / delta) % 6;
      } else if (max === gg) {
        h = (bb - rr) / delta + 2;
      } else {
        h = (rr - gg) / delta + 4;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : Math.round((delta / max) * 100);
    const v = Math.round(max * 100);

    return { h, s, v };
  };

  const hsvToRgb = ({ h, s, v }) => {
    const hh = h % 360;
    const ss = s / 100;
    const vv = v / 100;
    const c = vv * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = vv - c;
    let rr = 0;
    let gg = 0;
    let bb = 0;

    if (hh < 60) {
      rr = c;
      gg = x;
    } else if (hh < 120) {
      rr = x;
      gg = c;
    } else if (hh < 180) {
      gg = c;
      bb = x;
    } else if (hh < 240) {
      gg = x;
      bb = c;
    } else if (hh < 300) {
      rr = x;
      bb = c;
    } else {
      rr = c;
      bb = x;
    }

    return {
      r: Math.round((rr + m) * 255),
      g: Math.round((gg + m) * 255),
      b: Math.round((bb + m) * 255),
    };
  };

  const hsv = React.useMemo(() => rgbToHsv(hexToRgb(brushColor)), [brushColor]);

  const updateColorFromHsv = (next) => {
    setBrushColor(rgbToHex(hsvToRgb(next)));
  };

  const handleHueChange = (value) => {
    updateColorFromHsv({ ...hsv, h: value });
  };

  const handleSaturationChange = (value) => {
    updateColorFromHsv({ ...hsv, s: value });
  };

  const handleValueChange = (value) => {
    updateColorFromHsv({ ...hsv, v: value });
  };

  return (
    <div className="home-editor">
      <aside className="sidebar-panel">
        <div className="sidebar-block tool-toggle-row">
          <button
            type="button"
            className={`tool-button ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => setTool('brush')}
          >
            Brush
          </button>
          <button
            type="button"
            className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
          >
            Eraser
          </button>
        </div>

        <div className="sidebar-block color-preview-block">
          <div className="color-picker-panel">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="color-picker-block"
              title="Pick brush color"
            />
          </div>
          <div className="color-slider-group">
            <div className="slider-row">
              <label htmlFor="hue-slider">Hue</label>
              <input
                id="hue-slider"
                type="range"
                min="0"
                max="360"
                value={hsv.h}
                onChange={(e) => handleHueChange(Number(e.target.value))}
                className="color-slider"
              />
              <span>{hsv.h}</span>
            </div>
            <div className="slider-row">
              <label htmlFor="sat-slider">Sat</label>
              <input
                id="sat-slider"
                type="range"
                min="0"
                max="100"
                value={hsv.s}
                onChange={(e) => handleSaturationChange(Number(e.target.value))}
                className="color-slider"
              />
              <span>{hsv.s}%</span>
            </div>
            <div className="slider-row">
              <label htmlFor="val-slider">Val</label>
              <input
                id="val-slider"
                type="range"
                min="0"
                max="100"
                value={hsv.v}
                onChange={(e) => handleValueChange(Number(e.target.value))}
                className="color-slider"
              />
              <span>{hsv.v}%</span>
            </div>
          </div>
        </div>

        <div className="sidebar-block brush-size-block">
          <label className="brush-size-label">Brush Size: {brushRadius}</label>
          <input
            type="range"
            min="1"
            max="100"
            value={brushRadius}
            onChange={(e) => handleBrushSizeChange(Number(e.target.value))}
            className="brush-size-slider"
          />
        </div>

        <div className="sidebar-block layer-row">
          <button className="layer-button" type="button" />
          <button className="layer-button" type="button" />
        </div>

        <div className="sidebar-block checkbox-group">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={onionSkinEnabled}
              onChange={(e) => setOnionSkinEnabled(e.target.checked)}
            />
            <span>Onion Skin</span>
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={loopEnabled}
              onChange={(e) => setLoopEnabled(e.target.checked)}
            />
            <span>Loop</span>
          </label>
        </div>

        <div className="sidebar-block">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sidebar-input"
            placeholder="Title"
          />
        </div>

        <div className="sidebar-block split-inputs">
          <input
            type="text"
            value={metaLeft}
            onChange={(e) => setMetaLeft(e.target.value)}
            className="sidebar-input"
            placeholder="Label"
          />
          <input
            type="text"
            value={metaRight}
            onChange={(e) => setMetaRight(e.target.value)}
            className="sidebar-input"
            placeholder="Value"
          />
        </div>

        <div className="sidebar-block description-block">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="description-textarea"
            placeholder="Description..."
          />
        </div>

        <div className="sidebar-block toolbar-row">
          <span>Export</span>
          <span className="toolbar-icon">▾</span>
        </div>
        <div className="sidebar-block export-blank" />
      </aside>

      <main className="main-content">
        <section className="timeline-bar">
          <div className="frames-box">
            <div className="frames-row">
              {frames.map((frame) => (
                <button
                  key={frame}
                  type="button"
                  onClick={() => setCurrentFrame(frame)}
                  className={`frame-thumb ${currentFrame === frame ? 'frame-thumb-active' : ''}`}
                >
                  <div className="frame-box" />
                  <span className="frame-label">{frame}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="canvas-area">
          <div className="canvas-header">
            <div className="canvas-title">Frame {currentFrame}</div>
            <div className="canvas-actions">
              <button className="action-button" type="button" onClick={handleUndo} disabled={!historyState.canUndo}>
                Undo
              </button>
              <button className="action-button" type="button" onClick={handleRedo} disabled={!historyState.canRedo}>
                Redo
              </button>
              <button className="action-button" type="button" onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>

          <div className="canvas-frame">
            <Canvas
              ref={canvasRef}
              tool={tool}
              brushColor={brushColor}
              canvasHeight={550}
              canvasWidth={550}
              brushRadius={brushRadius}
              onHistoryStateChange={handleHistoryStateChange}
              onionSkinEnabled={onionSkinEnabled}
              onionSkinImageData={frameStatesRef.current[currentFrame === 1 ? 30 : currentFrame - 1]}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
