import { encodeGif } from './gifEncoder';
import type { GifExportResult } from '../types';

const DEFAULT_FILE_NAME = 'flipbook-animation.gif';

export const getGifExportFileName = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return DEFAULT_FILE_NAME;

  const safe = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${safe || 'flipbook-animation'}.gif`;
};

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const hasFrameContent = (imageData: ImageData | null | undefined): boolean => {
  if (!imageData) return false;
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] !== 0) return true;
  }
  return false;
};

const getLastDrawnFrame = (
  frames: number[],
  frameStates: Record<number, ImageData | null>
): number | null => {
  let last: number | null = null;
  for (const frame of frames) {
    if (hasFrameContent(frameStates[frame])) last = frame;
  }
  return last;
};

interface BuildGifExportOptions {
  width: number;
  height: number;
  frames: number[];
  frameStates: Record<number, ImageData | null>;
  fps: number;
  loop: boolean;
}

export const buildGifExport = ({
  width,
  height,
  frames,
  frameStates,
  fps,
  loop,
}: BuildGifExportOptions): GifExportResult | null => {
  const lastDrawnFrame = getLastDrawnFrame(frames, frameStates);
  if (lastDrawnFrame === null) return null;

  const framesToExport: (ImageData | null)[] = [];
  for (let f = 1; f <= lastDrawnFrame; f++) {
    framesToExport.push(frameStates[f] ?? null);
  }

  const gifBytes = encodeGif({ width, height, frames: framesToExport, fps, loop });

  return {
    blob: new Blob([gifBytes.buffer as ArrayBuffer], { type: 'image/gif' }),
    frameCount: framesToExport.length,
    lastDrawnFrame,
    width,
    height,
    fps,
  };
};
