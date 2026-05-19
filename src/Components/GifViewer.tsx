import { useCallback, useEffect, useRef, useState } from 'react';
import { useGifDecoder } from '../hooks/useGifDecoder';

interface GifViewerProps {
  url: string;
  title: string;
  defaultFps?: number;
}

interface ThumbProps {
  imageData: ImageData;
  srcWidth: number;
  srcHeight: number;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

const THUMB_W = 54;
const THUMB_H = 40;

const GifFrameThumb = ({ imageData, srcWidth, srcHeight, index, isActive, onClick }: ThumbProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tmp = document.createElement('canvas');
    tmp.width = srcWidth;
    tmp.height = srcHeight;
    tmp.getContext('2d')?.putImageData(imageData, 0, 0);
    ctx.clearRect(0, 0, THUMB_W, THUMB_H);
    ctx.drawImage(tmp, 0, 0, THUMB_W, THUMB_H);
  }, [imageData, srcWidth, srcHeight]);

  return (
    <button
      type="button"
      className={`gif-viewer-thumb${isActive ? ' gif-viewer-thumb-active' : ''}`}
      onClick={onClick}
      aria-label={`Frame ${index + 1}`}
      aria-current={isActive}
    >
      <canvas ref={canvasRef} width={THUMB_W} height={THUMB_H} className="gif-viewer-thumb-canvas" />
      <span className="gif-viewer-thumb-num">{index + 1}</span>
    </button>
  );
};

const GifViewer = ({ url, title, defaultFps = 12 }: GifViewerProps) => {
  const { frames, width, height, isLoading, error } = useGifDecoder(url);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(defaultFps);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-play once frames are ready
  useEffect(() => {
    if (frames.length > 0) {
      setCurrentFrame(0);
      setIsPlaying(true);
    }
  }, [frames.length]);

  // Render current frame to main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames.length) return;
    canvas.getContext('2d')?.putImageData(frames[currentFrame].imageData, 0, 0);
  }, [frames, currentFrame]);

  // Scroll active thumb into view
  useEffect(() => {
    const scrubber = scrubberRef.current;
    if (!scrubber) return;
    const active = scrubber.querySelector<HTMLElement>('.gif-viewer-thumb-active');
    if (active) {
      active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }
  }, [currentFrame]);

  // Playback interval
  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isPlaying || !frames.length) return;

    intervalRef.current = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isPlaying, fps, frames.length]);

  const goToPrev = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame(prev => (prev - 1 + frames.length) % frames.length);
  }, [frames.length]);

  const goToNext = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame(prev => (prev + 1) % frames.length);
  }, [frames.length]);

  const goToFrame = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentFrame(index);
  }, []);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

  if (isLoading) {
    return (
      <div className="gif-viewer gif-viewer-state">
        <p className="gif-viewer-state-text">Decoding frames...</p>
      </div>
    );
  }

  if (error || !frames.length) {
    return (
      <div className="gif-viewer gif-viewer-state">
        <p className="gif-viewer-state-text">Could not load GIF frames.</p>
      </div>
    );
  }

  return (
    <div className="gif-viewer">
      <div className="gif-viewer-stage">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="gif-viewer-canvas"
          aria-label={title}
        />
      </div>

      <div className="gif-viewer-controls">
        <div className="gif-viewer-playback-row">
          <button type="button" className="gif-viewer-btn" onClick={goToPrev} aria-label="Previous frame">
            &#9664;
          </button>
          <button type="button" className="gif-viewer-btn gif-viewer-btn-play" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button type="button" className="gif-viewer-btn" onClick={goToNext} aria-label="Next frame">
            &#9654;
          </button>
          <span className="gif-viewer-frame-count">
            Frame {currentFrame + 1} / {frames.length}
          </span>
        </div>

        <div className="gif-viewer-fps-row">
          <span className="gif-viewer-fps-label">FPS</span>
          <input
            type="range"
            min={1}
            max={24}
            value={fps}
            onChange={e => setFps(Number(e.target.value))}
            className="gif-viewer-fps-slider"
            aria-label="Playback speed in frames per second"
          />
          <span className="gif-viewer-fps-value">{fps}</span>
        </div>
      </div>

      <div className="gif-viewer-scrubber" ref={scrubberRef}>
        {frames.map((frame, i) => (
          <GifFrameThumb
            key={i}
            imageData={frame.imageData}
            srcWidth={width}
            srcHeight={height}
            index={i}
            isActive={i === currentFrame}
            onClick={() => goToFrame(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default GifViewer;
