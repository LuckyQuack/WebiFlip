import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getGifExportFileName, hasFrameContent, buildGifExport } from '../utils/gifExport';

// Mock encodeGif so tests run without the real GIF encoder (heavy WASM-like logic)
vi.mock('../utils/gifEncoder', () => ({
  encodeGif: vi.fn(() => new Uint8Array([0x47, 0x49, 0x46])), // "GIF" magic bytes
}));

// Helper — creates an ImageData-like object with fully opaque pixels
const makeFilledImageData = (width = 4, height = 4): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
};

// Helper — creates a fully transparent ImageData (all alpha = 0)
const makeEmptyImageData = (width = 4, height = 4): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4); // zeros
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
};

describe('getGifExportFileName', () => {
  it('returns default name for empty title', () => {
    expect(getGifExportFileName('')).toBe('flipbook-animation.gif');
    expect(getGifExportFileName('   ')).toBe('flipbook-animation.gif');
  });

  it('lowercases and slugifies the title', () => {
    expect(getGifExportFileName('My Cool Flip')).toBe('my-cool-flip.gif');
    expect(getGifExportFileName('Hello World!')).toBe('hello-world.gif');
  });

  it('strips leading and trailing dashes', () => {
    expect(getGifExportFileName('---test---')).toBe('test.gif');
  });

  it('collapses multiple special characters into one dash', () => {
    expect(getGifExportFileName('a  &  b')).toBe('a-b.gif');
  });

  it('falls back to default when title reduces to empty after sanitisation', () => {
    expect(getGifExportFileName('!!!')).toBe('flipbook-animation.gif');
  });

  it('always appends .gif extension', () => {
    const name = getGifExportFileName('animation');
    expect(name.endsWith('.gif')).toBe(true);
  });
});

describe('hasFrameContent', () => {
  it('returns false for null or undefined', () => {
    expect(hasFrameContent(null)).toBe(false);
    expect(hasFrameContent(undefined)).toBe(false);
  });

  it('returns false for all-transparent ImageData', () => {
    expect(hasFrameContent(makeEmptyImageData())).toBe(false);
  });

  it('returns true when at least one pixel has alpha > 0', () => {
    const imageData = makeEmptyImageData();
    imageData.data[3] = 1; // set alpha of first pixel
    expect(hasFrameContent(imageData)).toBe(true);
  });

  it('returns true for fully opaque ImageData', () => {
    expect(hasFrameContent(makeFilledImageData())).toBe(true);
  });
});

describe('buildGifExport', () => {
  const baseOptions = {
    width: 4,
    height: 4,
    frames: [1, 2, 3],
    fps: 12,
    loop: true,
  };

  it('returns null when no frames have content', () => {
    const frameStates: Record<number, ImageData | null> = {
      1: null,
      2: makeEmptyImageData(),
      3: null,
    };
    expect(buildGifExport({ ...baseOptions, frameStates })).toBeNull();
  });

  it('returns a result when at least one frame has content', () => {
    const frameStates: Record<number, ImageData | null> = {
      1: makeFilledImageData(),
      2: null,
      3: null,
    };
    const result = buildGifExport({ ...baseOptions, frameStates });
    expect(result).not.toBeNull();
  });

  it('result blob has correct MIME type', () => {
    const frameStates: Record<number, ImageData | null> = {
      1: makeFilledImageData(),
      2: null,
      3: null,
    };
    const result = buildGifExport({ ...baseOptions, frameStates })!;
    expect(result.blob.type).toBe('image/gif');
  });

  it('frameCount equals frames up to the last drawn frame', () => {
    const frameStates: Record<number, ImageData | null> = {
      1: makeFilledImageData(),
      2: null,
      3: makeFilledImageData(),
    };
    const result = buildGifExport({ ...baseOptions, frameStates })!;
    // lastDrawnFrame = 3, so framesToExport = [1, 2, 3]
    expect(result.frameCount).toBe(3);
    expect(result.lastDrawnFrame).toBe(3);
  });

  it('does not include frames after the last drawn frame', () => {
    const frameStates: Record<number, ImageData | null> = {
      1: makeFilledImageData(),
      2: null,
      3: null,
    };
    const result = buildGifExport({ ...baseOptions, frameStates })!;
    expect(result.frameCount).toBe(1);
    expect(result.lastDrawnFrame).toBe(1);
  });

  it('passes width, height, fps through to the result', () => {
    const frameStates = { 1: makeFilledImageData(8, 8), 2: null, 3: null };
    const result = buildGifExport({ ...baseOptions, width: 8, height: 8, fps: 6, frameStates })!;
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.fps).toBe(6);
  });
});
