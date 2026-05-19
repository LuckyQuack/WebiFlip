import { useEffect, useState } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

export interface GifFrame {
  imageData: ImageData;
  delayMs: number;
}

interface GifDecoderState {
  frames: GifFrame[];
  width: number;
  height: number;
  isLoading: boolean;
  error: string;
}

const INITIAL_STATE: GifDecoderState = {
  frames: [],
  width: 0,
  height: 0,
  isLoading: true,
  error: '',
};

const MIN_FRAME_DELAY_MS = 20;

function compositeFrames(
  rawFrames: ReturnType<typeof decompressFrames<true>>,
  width: number,
  height: number,
): GifFrame[] {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return [];

  const composed: GifFrame[] = [];
  const scratch = document.createElement('canvas');

  let prevDisposal = 0;
  let prevDims = { left: 0, top: 0, width: 0, height: 0 };
  let restoreData: ImageData | null = null;

  for (const frame of rawFrames) {
    const { dims, patch, delay, disposalType } = frame;

    // Apply disposal of previous frame before drawing this one
    if (prevDisposal === 2) {
      ctx.clearRect(prevDims.left, prevDims.top, prevDims.width, prevDims.height);
    } else if (prevDisposal === 3 && restoreData) {
      ctx.putImageData(restoreData, 0, 0);
      restoreData = null;
    }

    // Save state before drawing if this frame needs restore-to-previous disposal
    if (disposalType === 3) {
      restoreData = ctx.getImageData(0, 0, width, height);
    }

    // Draw patch using a scratch canvas so transparent pixels alpha-blend correctly
    scratch.width = dims.width;
    scratch.height = dims.height;
    const scratchCtx = scratch.getContext('2d');
    if (scratchCtx) {
      scratchCtx.putImageData(new ImageData(new Uint8ClampedArray(patch), dims.width, dims.height), 0, 0);
      ctx.drawImage(scratch, dims.left, dims.top);
    }

    composed.push({
      imageData: ctx.getImageData(0, 0, width, height),
      delayMs: Math.max(MIN_FRAME_DELAY_MS, delay * 10),
    });

    prevDisposal = disposalType ?? 0;
    prevDims = dims;
  }

  return composed;
}

export function useGifDecoder(url: string): GifDecoderState {
  const [state, setState] = useState<GifDecoderState>(INITIAL_STATE);

  useEffect(() => {
    if (!url) return;

    setState(INITIAL_STATE);
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.arrayBuffer();
        const parsed = parseGIF(buffer);
        const rawFrames = decompressFrames(parsed, true);

        if (!rawFrames.length) throw new Error('GIF has no frames');

        const { width, height } = parsed.lsd;
        const frames = compositeFrames(rawFrames, width, height);

        if (!cancelled) {
          setState({ frames, width, height, isLoading: false, error: '' });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            frames: [],
            width: 0,
            height: 0,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to decode GIF',
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  return state;
}
