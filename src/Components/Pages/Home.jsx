import React, { useState, useRef, useEffect } from 'react';
import Canvas from '../Canvas';
import ExportMenu from '../ExportMenu';
import FrameTimeline from '../FrameTimeline';
import { buildGifExport, downloadBlob, getGifExportFileName } from '../../utils/gifExport';
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
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [thumbnailVersion, setThumbnailVersion] = useState(0);
  const canvasRef = useRef(null);
  const frameStatesRef = useRef({});
  const frameHistoryRef = useRef({});
  const previousFrameRef = useRef(1);
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
    setThumbnailVersion((prev) => prev + 1);
  };

  const handleExportGif = async () => {
    if (isExportingGif) return;

    saveCurrentFrameState();
    setIsExportingGif(true);

    try {
      const exportResult = buildGifExport({
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        frames,
        frameStates: frameStatesRef.current,
        hasFrameContent,
        fps: playFps,
        loop: loopEnabled,
      });

      if (!exportResult) {
        window.alert('Draw at least one frame before exporting a GIF.');
        return;
      }

      downloadBlob(exportResult.blob, getGifExportFileName(title));
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
    if (!canvasRef.current) return;
    if (previousFrameRef.current === currentFrame) return;

    const frameToSave = previousFrameRef.current;
    const frameToLoad = currentFrame;

    const saveFrame = () => {
      if (canvasRef.current?.captureFrameState) {
        const frameState = canvasRef.current.captureFrameState();
        frameStatesRef.current[frameToSave] = frameState || null;
      }

      if (canvasRef.current?.historyManager?.getFullState) {
        const historyState = canvasRef.current.historyManager.getFullState();
        frameHistoryRef.current[frameToSave] = historyState;
      }

      setThumbnailVersion((prev) => prev + 1);
    };

    const loadFrame = () => {
      if (canvasRef.current?.loadFrameState) {
        const frameState = frameStatesRef.current[frameToLoad] || null;
        canvasRef.current.loadFrameState(frameState, getOnionSkinData(frameToLoad), onionSkinEnabled);

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

  useEffect(() => {
    if (!canvasRef.current?.loadFrameState) return;

    const frameState = frameStatesRef.current[currentFrame] || null;
    canvasRef.current.loadFrameState(frameState, getOnionSkinData(currentFrame), onionSkinEnabled);
  }, [onionSkinEnabled, currentFrame]);

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
      setThumbnailVersion((prev) => prev + 1);
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

        <ExportMenu
          disabled={isExportingGif}
          options={[
            {
              label: 'GIF Export',
              onClick: handleExportGif,
            },
          ]}
        />
      </aside>

      <main className="main-content">
        <FrameTimeline
          frames={frames}
          currentFrame={currentFrame}
          frameStates={frameStatesRef.current}
          thumbnailVersion={thumbnailVersion}
          isPlaying={isPlaying}
          playFps={playFps}
          onSelectFrame={(frame) => {
            setIsPlaying(false);
            setCurrentFrame(frame);
          }}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          onTogglePlay={handleTogglePlay}
          onFpsChange={setPlayFps}
        />

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
