import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const FRAME_DELAY_FALLBACK_MS = 1000 / 6;

const toRgbaFrameData = (frame, width, height) => {
  const pixelCount = width * height;
  const rgba = new Uint8Array(pixelCount * 4);

  if (!frame) {
    for (let i = 0; i < pixelCount; i += 1) {
      const offset = i * 4;
      rgba[offset] = 255;
      rgba[offset + 1] = 255;
      rgba[offset + 2] = 255;
      rgba[offset + 3] = 255;
    }
    return rgba;
  }

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4;
    const alpha = frame.data[offset + 3] / 255;
    const inverseAlpha = 1 - alpha;

    rgba[offset] = Math.round(frame.data[offset] * alpha + 255 * inverseAlpha);
    rgba[offset + 1] = Math.round(frame.data[offset + 1] * alpha + 255 * inverseAlpha);
    rgba[offset + 2] = Math.round(frame.data[offset + 2] * alpha + 255 * inverseAlpha);
    rgba[offset + 3] = 255;
  }

  return rgba;
};

export const encodeGif = ({ width, height, frames, fps = 6, loop = true }) => {
  if (!frames || frames.length === 0) {
    throw new Error('At least one frame is required to encode a GIF.');
  }

  const encoder = GIFEncoder();
  const frameDelay = Math.max(20, Math.round(1000 / Math.max(1, fps || FRAME_DELAY_FALLBACK_MS)));
  const repeat = loop ? 0 : -1;

  frames.forEach((frame, index) => {
    const rgba = toRgbaFrameData(frame, width, height);
    const palette = quantize(rgba, 256, { format: 'rgb565' });
    const pixels = applyPalette(rgba, palette, 'rgb565');

    encoder.writeFrame(pixels, width, height, {
      palette,
      delay: frameDelay,
      repeat,
      first: index === 0,
    });
  });

  encoder.finish();
  return encoder.bytes();
};
