import { encodeGif } from './gifEncoder';

const DEFAULT_EXPORT_FILE_NAME = 'flipbook-animation.gif';

export const getGifExportFileName = (title) => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return DEFAULT_EXPORT_FILE_NAME;
  }

  const safeTitle = trimmedTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${safeTitle || 'flipbook-animation'}.gif`;
};

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const getLastDrawnFrame = (frames, hasFrameContent, frameStates) => {
  let last = null;

  frames.forEach((frame) => {
    if (hasFrameContent(frameStates[frame])) {
      last = frame;
    }
  });

  return last;
};

export const buildGifExport = ({
  width,
  height,
  frames,
  frameStates,
  hasFrameContent,
  fps,
  loop,
}) => {
  const lastDrawnFrame = getLastDrawnFrame(frames, hasFrameContent, frameStates);

  if (!lastDrawnFrame) {
    return null;
  }

  const framesToExport = [];
  for (let frame = 1; frame <= lastDrawnFrame; frame += 1) {
    framesToExport.push(frameStates[frame] || null);
  }

  const gifBytes = encodeGif({
    width,
    height,
    frames: framesToExport,
    fps,
    loop,
  });

  return {
    blob: new Blob([gifBytes], { type: 'image/gif' }),
    frameCount: framesToExport.length,
    lastDrawnFrame,
    width,
    height,
    fps,
  };
};
