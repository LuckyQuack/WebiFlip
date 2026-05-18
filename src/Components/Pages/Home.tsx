import { useCallback, useRef, useState } from 'react';
import Canvas from '../Canvas';
import ExportMenu from '../ExportMenu';
import FrameTimeline from '../FrameTimeline';
import PostToBoardDialog from '../PostToBoardDialog';
import { useColorPicker } from '../../hooks/useColorPicker';
import { useFrameManager } from '../../hooks/useFrameManager';
import { usePlayback } from '../../hooks/usePlayback';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useBoardPost } from '../../hooks/useBoardPost';
import { buildGifExport, downloadBlob, getGifExportFileName, hasFrameContent } from '../../utils/gifExport';
import { captureError, trackEvent } from '../../utils/monitoring';
import type { BoardPost, DrawingTool, HistoryState } from '../../types';
import type { CanvasHandle } from '../Canvas';
import './Home.css';

const CANVAS_SIZE = 550;
const FRAME_COUNT = 30;
const FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) => i + 1);

interface HomeProps {
  isActive?: boolean;
  onPostCreated?: (post: BoardPost) => void;
  onNavigateToBoard?: () => void;
}

const Home = ({ isActive = true, onPostCreated, onNavigateToBoard }: HomeProps) => {
  const [tool, setTool] = useState<DrawingTool>('brush');
  const [brushRadii, setBrushRadii] = useState({ brush: 8, eraser: 24 });
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [historyState, setHistoryState] = useState<HistoryState>({ undoCount: 0, redoCount: 0, canUndo: false, canRedo: false });
  const [isExportingGif, setIsExportingGif] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const frameStatesRef = useRef<Record<number, ImageData | null>>({});
  const brushRadius = brushRadii[tool] ?? brushRadii.brush;

  const { brushColor, hsv, setBrushColor, handleHueChange, handleSaturationChange, handleValueChange } = useColorPicker();

  const getLastDrawnFrame = useCallback((): number => {
    let last = 1;
    for (const frame of FRAMES) {
      if (hasFrameContent(frameStatesRef.current[frame])) last = frame;
    }
    return last;
  }, []);

  const { currentFrame, setCurrentFrame, isPlaying, setIsPlaying, loopEnabled, setLoopEnabled, playFps, setPlayFps, handleTogglePlay, handleMoveLeft, handleMoveRight } =
    usePlayback({ isActive, getLastDrawnFrame });

  const handleHistoryStateChange = useCallback((state: HistoryState) => setHistoryState(state), []);

  const { thumbnailVersion, saveCurrentFrameState } = useFrameManager({
    frameStatesRef,
    currentFrame,
    onionSkinEnabled,
    canvasRef,
    onHistoryStateChange: handleHistoryStateChange,
  });

  const buildCurrentGifExport = useCallback(() => {
    saveCurrentFrameState();
    return buildGifExport({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      frames: FRAMES,
      frameStates: frameStatesRef.current,
      fps: playFps,
      loop: loopEnabled,
    });
  }, [saveCurrentFrameState, frameStatesRef, playFps, loopEnabled]);

  const handlePostCreated = useCallback((post: BoardPost) => {
    setTitle('');
    setDescription('');
    onPostCreated?.(post);
  }, [onPostCreated]);

  const {
    isPostingToBoard,
    isPostDialogOpen,
    pendingBoardExport,
    submitError,
    handleOpenPostDialog,
    handleSubmitBoardPost,
    closePostDialog,
  } = useBoardPost({ buildGifExport: buildCurrentGifExport, onPostCreated: handlePostCreated, onNavigateToBoard });

  const handleExportGif = useCallback(async () => {
    if (isExportingGif) return;
    setIsExportingGif(true);
    try {
      const result = buildCurrentGifExport();
      if (!result) {
        window.alert('Draw at least one frame before exporting a GIF.');
        return;
      }
      trackEvent('gif.exported', {
        frameCount: result.frameCount,
        fps: result.fps,
        fileSizeKb: Math.round(result.blob.size / 1024),
      });
      downloadBlob(result.blob, getGifExportFileName(title));
    } catch (err) {
      captureError(err, { context: 'handleExportGif' });
      window.alert('GIF export failed. Please try again.');
    } finally {
      setIsExportingGif(false);
    }
  }, [isExportingGif, buildCurrentGifExport, title]);

  const handleHistoryChange = useCallback(() => {
    if (canvasRef.current?.getHistoryState) {
      setHistoryState(canvasRef.current.getHistoryState());
    }
    saveCurrentFrameState();
  }, [saveCurrentFrameState]);

  useKeyboardShortcuts({
    isActive,
    isPostDialogOpen,
    canvasRef,
    onSetTool: setTool,
    onTogglePlay: handleTogglePlay,
    onMoveLeft: handleMoveLeft,
    onMoveRight: handleMoveRight,
    onToggleOnionSkin: () => setOnionSkinEnabled((prev) => !prev),
  });

  return (
    <div className="home-editor">
      <aside className="sidebar-panel">
        <div className="sidebar-block tool-toggle-row">
          <button type="button" className={`tool-button ${tool === 'brush' ? 'active' : ''}`} onClick={() => setTool('brush')}>
            Brush
          </button>
          <button type="button" className={`tool-button ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>
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
              <input id="hue-slider" type="range" min="0" max="360" value={hsv.h} onChange={(e) => handleHueChange(Number(e.target.value))} className="color-slider" />
              <span>{hsv.h}</span>
            </div>
            <div className="slider-row">
              <label htmlFor="sat-slider">Sat</label>
              <input id="sat-slider" type="range" min="0" max="100" value={hsv.s} onChange={(e) => handleSaturationChange(Number(e.target.value))} className="color-slider" />
              <span>{hsv.s}%</span>
            </div>
            <div className="slider-row">
              <label htmlFor="val-slider">Val</label>
              <input id="val-slider" type="range" min="0" max="100" value={hsv.v} onChange={(e) => handleValueChange(Number(e.target.value))} className="color-slider" />
              <span>{hsv.v}%</span>
            </div>
          </div>
        </div>

        <div className="sidebar-block brush-size-block">
          <label className="brush-size-label">Brush Size: {brushRadius}</label>
          <input
            type="range" min="1" max="100" value={brushRadius}
            onChange={(e) => setBrushRadii((prev) => ({ ...prev, [tool]: Number(e.target.value) }))}
            className="brush-size-slider"
          />
        </div>

        <div className="sidebar-block checkbox-group">
          <label className="checkbox-item">
            <input type="checkbox" checked={onionSkinEnabled} onChange={(e) => setOnionSkinEnabled(e.target.checked)} />
            <span>Onion Skin</span>
          </label>
          <label className="checkbox-item">
            <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} />
            <span>Loop</span>
          </label>
        </div>

        <div className="sidebar-block">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="sidebar-input" placeholder="Title" />
        </div>

        <div className="sidebar-block description-block">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="description-textarea" placeholder="Description..." />
        </div>

        <ExportMenu
          disabled={isExportingGif || isPostingToBoard}
          options={[
            { label: 'GIF Export', onClick: handleExportGif },
            { label: 'Post to Board', onClick: handleOpenPostDialog },
          ]}
        />
      </aside>

      <main className="main-content">
        <FrameTimeline
          frames={FRAMES}
          currentFrame={currentFrame}
          frameStates={frameStatesRef.current}
          thumbnailVersion={thumbnailVersion}
          isPlaying={isPlaying}
          playFps={playFps}
          onSelectFrame={(frame) => { setIsPlaying(false); setCurrentFrame(frame); }}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          onTogglePlay={handleTogglePlay}
          onFpsChange={setPlayFps}
        />

        <section className="canvas-area">
          <div className="canvas-header">
            <div className="canvas-title">Frame {currentFrame}</div>
            <div className="canvas-actions">
              <button className="action-button" type="button" onClick={() => canvasRef.current?.undo()} disabled={!historyState.canUndo}>Undo</button>
              <button className="action-button" type="button" onClick={() => canvasRef.current?.redo()} disabled={!historyState.canRedo}>Redo</button>
              <button className="action-button" type="button" onClick={() => {
                canvasRef.current?.clear();
                frameStatesRef.current[currentFrame] = null;
              }}>Clear</button>
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
              onHistoryStateChange={handleHistoryChange}
            />
          </div>
        </section>
      </main>

      <PostToBoardDialog
        open={isPostDialogOpen}
        previewUrl={pendingBoardExport?.previewUrl ?? ''}
        exportMeta={pendingBoardExport}
        initialTitle={title}
        initialCaption={description}
        isSubmitting={isPostingToBoard}
        submitError={submitError}
        onClose={closePostDialog}
        onSubmit={handleSubmitBoardPost}
      />
    </div>
  );
};

export default Home;
