import { useCallback, useEffect, useState } from 'react';

const FRAME_COUNT = 30;

interface UsePlaybackProps {
  isActive: boolean;
  getLastDrawnFrame: () => number;
}

interface UsePlaybackReturn {
  currentFrame: number;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  loopEnabled: boolean;
  setLoopEnabled: (enabled: boolean) => void;
  playFps: number;
  setPlayFps: (fps: number) => void;
  handleTogglePlay: () => void;
  handleMoveLeft: () => void;
  handleMoveRight: () => void;
}

export const usePlayback = ({ isActive, getLastDrawnFrame }: UsePlaybackProps): UsePlaybackReturn => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [playFps, setPlayFps] = useState(6);

  const handleTogglePlay = useCallback(() => {
    const lastFrame = getLastDrawnFrame();
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setCurrentFrame(1);
    if (lastFrame > 1) setIsPlaying(true);
  }, [getLastDrawnFrame, isPlaying]);

  const handleMoveLeft = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(1, prev - 1));
  }, []);

  const handleMoveRight = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.min(FRAME_COUNT, prev + 1));
  }, []);

  // Playback interval
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const lastFrame = getLastDrawnFrame();
        if (prev >= lastFrame) {
          if (loopEnabled) return 1;
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playFps);

    return () => clearInterval(interval);
  }, [isPlaying, playFps, loopEnabled, getLastDrawnFrame]);

  // Stop playback when tab becomes inactive
  useEffect(() => {
    if (!isActive) setIsPlaying(false);
  }, [isActive]);

  return {
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    loopEnabled,
    setLoopEnabled,
    playFps,
    setPlayFps,
    handleTogglePlay,
    handleMoveLeft,
    handleMoveRight,
  };
};
