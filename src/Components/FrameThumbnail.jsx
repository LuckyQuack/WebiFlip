import React, { useEffect, useRef } from 'react';

const FRAME_THUMBNAIL_WIDTH = 48;
const FRAME_THUMBNAIL_HEIGHT = 32;

const FrameThumbnail = ({ imageData, version }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f5f5f5';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!imageData) return;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = imageData.width;
    offscreenCanvas.height = imageData.height;
    const offscreenContext = offscreenCanvas.getContext('2d');
    offscreenContext.putImageData(imageData, 0, 0);

    const scale = Math.min(
      canvas.width / offscreenCanvas.width,
      canvas.height / offscreenCanvas.height
    );
    const drawWidth = offscreenCanvas.width * scale;
    const drawHeight = offscreenCanvas.height * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;

    context.drawImage(offscreenCanvas, offsetX, offsetY, drawWidth, drawHeight);
  }, [imageData, version]);

  return (
    <canvas
      ref={canvasRef}
      className="frame-thumbnail"
      width={FRAME_THUMBNAIL_WIDTH}
      height={FRAME_THUMBNAIL_HEIGHT}
      aria-hidden="true"
    />
  );
};

export default FrameThumbnail;
