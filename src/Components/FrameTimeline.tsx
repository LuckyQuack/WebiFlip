import FrameThumbnail from './FrameThumbnail';

interface FrameTimelineProps {
  frames: number[];
  currentFrame: number;
  frameStates: Record<number, ImageData | null>;
  thumbnailVersion: number;
  isPlaying: boolean;
  playFps: number;
  onSelectFrame: (frame: number) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onTogglePlay: () => void;
  onFpsChange: (fps: number) => void;
}

const FrameTimeline = ({
  frames,
  currentFrame,
  frameStates,
  thumbnailVersion,
  isPlaying,
  playFps,
  onSelectFrame,
  onMoveLeft,
  onMoveRight,
  onTogglePlay,
  onFpsChange,
}: FrameTimelineProps) => {
  return (
    <section className="timeline-bar">
      <div className="frames-box">
        <div className="frames-row">
          {frames.map((frame) => (
            <button
              key={frame}
              type="button"
              onClick={() => onSelectFrame(frame)}
              className={`frame-thumb ${currentFrame === frame ? 'frame-thumb-active' : ''}`}
            >
              <div className="frame-box">
                <FrameThumbnail imageData={frameStates[frame] ?? null} version={thumbnailVersion} />
              </div>
              <span className="frame-label">{frame}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="playback-controls">
        <button className="playback-button" type="button" onClick={onMoveLeft} disabled={currentFrame === 1}>
          Previous
        </button>
        <button className="playback-button" type="button" onClick={onTogglePlay}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button className="playback-button" type="button" onClick={onMoveRight} disabled={currentFrame === frames.length}>
          Next
        </button>
        <div className="playback-speed">
          <label htmlFor="fps-slider">FPS: {playFps}</label>
          <input
            id="fps-slider"
            type="range"
            min="1"
            max="12"
            value={playFps}
            onChange={(e) => onFpsChange(Number(e.target.value))}
            className="fps-slider"
          />
        </div>
      </div>
    </section>
  );
};

export default FrameTimeline;
