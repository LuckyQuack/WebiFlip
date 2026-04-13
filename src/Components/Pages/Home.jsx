import React, { useState, useRef, useEffect } from 'react';
import Canvas from '../Canvas';
import { encodeGif } from '../../utils/gifEncoder';
import './Home.css';

const CANVAS_SIZE = 550;

const Home = () => {
  const [tool, setTool] = useState('brush');
  const [brushColor, setBrushColor] = useState('#4AA3DF');
  const [brushRadius, setBrushRadius] = useState(8);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(true);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playFps, setPlayFps] = useState(6);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const canvasRef = useRef(null);
  const frameStatesRef = useRef({});
  const frameHistoryRef = useRef({});
  const previousFrameRef = useRef(1);
  const exportMenuRef = useRef(null);
  const frames = Array.from({ length: 30 }, (_, index) => index + 1);

  const hasFrameContent = (imageData) => {
    if (!imageData) return false;
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  };

  const getLastDrawnFrame = () => {
    let last = 1;
    frames.forEach((frame) => {
      if (hasFrameContent(frameStatesRef.current[frame])) {
        last = frame;
      }
    });
    return last;
  };

  const getPreviousFrameIndex = (frame) => {
    return frame > 1 ? frame - 1 : null;
  };

  const getOnionSkinData = (frame) => {
    const prevFrameIndex = getPreviousFrameIndex(frame);
    return prevFrameIndex ? frameStatesRef.current[prevFrameIndex] : null;
  };

  const saveCurrentFrameState = () => {
    if (!canvasRef.current?.captureFrameState) return;

    const frameState = canvasRef.current.captureFrameState();
    frameStatesRef.current[currentFrame] = frameState || null;
  };

  const getLastDrawnFrameOrNull = () => {
    let last = null;
    frames.forEach((frame) => {
      if (hasFrameContent(frameStatesRef.current[frame])) {
        last = frame;
      }
    });
    return last;
  };

  const getExportFileName = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return 'flipbook-animation.gif';
    }

    const safeTitle = trimmedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${safeTitle || 'flipbook-animation'}.gif`;
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportGif = async () => {
    if (isExportingGif) return;

    saveCurrentFrameState();
    const lastDrawnFrame = getLastDrawnFrameOrNull();

    if (!lastDrawnFrame) {
      window.alert('Draw at least one frame before exporting a GIF.');
      return;
    }

    setIsExportMenuOpen(false);
    setIsExportingGif(true);

    try {
      const framesToExport = [];
      for (let frame = 1; frame <= lastDrawnFrame; frame += 1) {
        framesToExport.push(frameStatesRef.current[frame] || null);
      }

      const gifBytes = encodeGif({
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        frames: framesToExport,
        fps: playFps,
        loop: loopEnabled,
      });

      const gifBlob = new Blob([gifBytes], { type: 'image/gif' });
      downloadBlob(gifBlob, getExportFileName());
    } catch (error) {
      console.error('GIF export failed:', error);
      window.alert('GIF export failed. Please try again.');
    } finally {
      setIsExportingGif(false);
    }
  };

  useEffect(() => {
    if (canvasRef.current && canvasRef.current.getHistoryState) {
      setHistoryState(canvasRef.current.getHistoryState());
    }
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!exportMenuRef.current?.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
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
        canvasRef.current.loadFrameState(frameState, getOnionSkinData(frameToLoad), onionSkinEnabled);
        
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
  }, [currentFrame]);

  // Re-render current frame when onion skin toggle changes
  useEffect(() => {
    if (!canvasRef.current?.loadFrameState) return;
    
    const frameState = frameStatesRef.current[currentFrame] || null;
    canvasRef.current.loadFrameState(frameState, getOnionSkinData(currentFrame), onionSkinEnabled);
  }, [onionSkinEnabled]);

  const handleHistoryStateChange = () => {
    if (canvasRef.current && canvasRef.current.getHistoryState) {
      setHistoryState(canvasRef.current.getHistoryState());
    }
    saveCurrentFrameState();
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

  const handleTogglePlay = () => {
    const lastFrame = getLastDrawnFrame();
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setCurrentFrame(1);
    if (lastFrame > 1) {
      setIsPlaying(true);
    }
  };

  const handleMoveLeft = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(1, prev - 1));
  };

  const handleMoveRight = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.min(30, prev + 1));
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const lastFrame = getLastDrawnFrame();
        if (prev >= lastFrame) {
          if (loopEnabled) {
            return 1;
          }
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playFps);

    return () => clearInterval(interval);
  }, [isPlaying, playFps, loopEnabled]);

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

        <div className="sidebar-block description-block">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="description-textarea"
            placeholder="Description..."
          />
        </div>

        <div className="sidebar-block export-menu" ref={exportMenuRef}>
          <button
            type="button"
            className="export-trigger"
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            disabled={isExportingGif}
          >
            <span>{isExportingGif ? 'Exporting...' : 'Export'}</span>
            <span className="toolbar-icon">{isExportMenuOpen ? '-' : '+'}</span>
          </button>
          {isExportMenuOpen ? (
            <div className="export-dropdown">
              <button
                type="button"
                className="export-option"
                onClick={handleExportGif}
                disabled={isExportingGif}
              >
                GIF Export
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="main-content">
        <section className="timeline-bar">
          <div className="frames-box">
            <div className="frames-row">
              {frames.map((frame) => (
                <button
                  key={frame}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrame(frame);
                  }}
                  className={`frame-thumb ${currentFrame === frame ? 'frame-thumb-active' : ''}`}
                >
                  <div className="frame-box" />
                  <span className="frame-label">{frame}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="playback-controls">
            <button className="playback-button" type="button" onClick={handleMoveLeft} disabled={currentFrame === 1}>
              ◀
            </button>
            <button className="playback-button" type="button" onClick={handleTogglePlay}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              className="playback-button"
              type="button"
              onClick={handleMoveRight}
              disabled={currentFrame === 30}
            >
              ▶
            </button>
            <div className="playback-speed">
              <label htmlFor="fps-slider">FPS: {playFps}</label>
              <input
                id="fps-slider"
                type="range"
                min="1"
                max="12"
                value={playFps}
                onChange={(e) => setPlayFps(Number(e.target.value))}
                className="fps-slider"
              />
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
              canvasHeight={CANVAS_SIZE}
              canvasWidth={CANVAS_SIZE}
              brushRadius={brushRadius}
              onHistoryStateChange={handleHistoryStateChange}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
