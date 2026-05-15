import { useEffect, useRef } from 'react';

const THUMBNAIL_WIDTH = 76;
const THUMBNAIL_HEIGHT = 56;

interface FrameThumbnailProps {
  imageData: ImageData | null;
  version: number;
}

const FrameThumbnail = ({ imageData, version }: FrameThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!imageData) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = imageData.width;
    offscreen.height = imageData.height;
    offscreen.getContext('2d')!.putImageData(imageData, 0, 0);

    const scale = Math.min(canvas.width / offscreen.width, canvas.height / offscreen.height);
    const drawWidth = offscreen.width * scale;
    const drawHeight = offscreen.height * scale;
    ctx.drawImage(offscreen, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
  }, [imageData, version]);

  return (
    <canvas
      ref={canvasRef}
      className="frame-thumbnail"
      width={THUMBNAIL_WIDTH}
      height={THUMBNAIL_HEIGHT}
      aria-hidden="true"
    />
  );
};

export default FrameThumbnail;
