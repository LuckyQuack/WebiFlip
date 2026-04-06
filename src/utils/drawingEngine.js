// Drawing engine with brush, eraser, text, and fill tools
// Pressure and tilt support for pen devices

window.__celstompPinching = true;

export const pressureCache = new Map;
export const tiltCache = new Map;
export const activePointers = new Map;

export let usePressureSize = true;
export let usePressureOpacity = false;
export let usePressureTilt = false;

export let brushSize = 3;
export let autofill = false;

export let textEntryActive = false;
export let textEntryX = 0;
export let textEntryY = 0;
export let textEntryEditId = null;
export let textEntryNextId = 1;
export let eraseStrokeBounds = null;

export let trailPoints = [];
export let rectToolStart = null;
export let rectToolPreview = null;
export let lineToolStart = null;
export let lineToolPreview = null;

export const PRESSURE_MIN = 0.05;
export let penDetected = false;
export let stabilizationLevel = 5;
export let pressureSmooth = 0.45;
export let strokeSmooth = 0.6;

let lastPt = null;
let stabilizedPt = null;
let strokeHex = null;
let isDrawing = false;
let isPanning = false;
let _fillEraseAllLayers = false;

export let panStart = { x: 0, y: 0, ox: 0, oy: 0 };

export function pressure(e) {
  const pid = Number.isFinite(e?.pointerId) ? e.pointerId : -1;
  const isPen = e?.pointerType === 'pen';
  const raw = typeof e?.pressure === 'number' && e.pressure > 0 ? e.pressure : isPen ? 0.35 : 1;
  const prev = pressureCache.has(pid) ? pressureCache.get(pid) : raw;
  const smoothed = prev + (raw - prev) * pressureSmooth;
  const out = Math.max(PRESSURE_MIN, Math.min(1, smoothed));
  pressureCache.set(pid, out);
  return out;
}

export function tiltAmount(e) {
  const pid = Number.isFinite(e?.pointerId) ? e.pointerId : -1;
  if (e?.pointerType !== 'pen') {
    tiltCache.set(pid, 0);
    return 0;
  }
  const tx = Number.isFinite(e?.tiltX) ? e.tiltX : 0;
  const ty = Number.isFinite(e?.tiltY) ? e.tiltY : 0;
  const raw = Math.max(0, Math.min(1, Math.hypot(tx, ty) / 90));
  const prev = tiltCache.has(pid) ? tiltCache.get(pid) : raw;
  const smoothed = prev + (raw - prev) * 0.35;
  const out = Math.max(0, Math.min(1, smoothed));
  tiltCache.set(pid, out);
  return out;
}

export function pressureSmoothFromLevel(level) {
  const lv = Math.max(0, Math.min(10, Number(level) || 0));
  return Math.max(0.2, Math.min(1, 1 - lv * 0.08));
}

export function strokeSmoothFromLevel(level) {
  const lv = Math.max(0, Math.min(10, Number(level) || 0));
  return Math.max(0.2, Math.min(1, 1 - lv * 0.08));
}

export function notePenDetected(e) {
  if (!e || e.pointerType !== 'pen') return;
  if (penDetected) return;
  penDetected = true;
}

export function shouldStabilizeTool(tool) {
  return tool === 'brush' || tool === 'eraser';
}

export function stabilizePoint(tool, e, x, y) {
  if (!shouldStabilizeTool(tool)) return { x, y };
  const pt = { x, y };
  if (!stabilizedPt) {
    stabilizedPt = pt;
    return pt;
  }
  stabilizedPt = {
    x: stabilizedPt.x + (pt.x - stabilizedPt.x) * strokeSmooth,
    y: stabilizedPt.y + (pt.y - stabilizedPt.y) * strokeSmooth,
  };
  return stabilizedPt;
}

export function resetStabilizedPt() {
  stabilizedPt = null;
}

export function getIsDrawing() {
  return isDrawing;
}

export function setIsDrawing(value) {
  isDrawing = value;
}

export function getIsPanning() {
  return isPanning;
}

export function setIsPanning(value) {
  isPanning = value;
}

export function getLastPt() {
  return lastPt;
}

export function setLastPt(pt) {
  lastPt = pt;
}

// Brush stamp cache for performance - this is the celstomp secret!
const brushStampCache = new Map();

function getBrushStamp(size, color) {
  const cacheKey = `circle|${Math.round(size)}|${color}`;
  
  if (brushStampCache.has(cacheKey)) {
    return brushStampCache.get(cacheKey);
  }

  const dim = Math.ceil(size);
  const canvas = document.createElement('canvas');
  canvas.width = dim;
  canvas.height = dim;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(dim / 2, dim / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  const stamp = {
    canvas,
    ox: dim / 2,
    oy: dim / 2,
    size
  };
  
  brushStampCache.set(cacheKey, stamp);
  return stamp;
}

export function clearBrushStampCache() {
  brushStampCache.clear();
}

export function stampLine(ctx, x0, y0, x1, y1, brushSize, color, opacity = 1) {
  const stamp = getBrushStamp(brushSize, color);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  
  // Smart spacing based on brush size - this is why celstomp feels smooth!
  const step = Math.max(1, brushSize * 0.5);
  const numStamps = Math.max(1, Math.ceil(dist / step));
  
  ctx.save();
  ctx.globalAlpha = opacity;
  
  // Distribute stamps along the line
  for (let i = 0; i <= numStamps; i++) {
    const t = numStamps > 0 ? i / numStamps : 0;
    const px = x0 + dx * t - stamp.ox;
    const py = y0 + dy * t - stamp.oy;
    ctx.drawImage(stamp.canvas, Math.round(px), Math.round(py));
  }
  
  ctx.restore();
}

export function drawPressureLine(ctx, fromX, fromY, toX, toY, baseBrushSize, fromPressure, toPressure, color, opacity = 1) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  const numSegments = Math.max(1, Math.ceil(distance));

  ctx.save();
  
  for (let i = 0; i < numSegments; i++) {
    const t = numSegments > 1 ? i / numSegments : 0;
    const nextT = numSegments > 1 ? (i + 1) / numSegments : 1;
    
    const currentPressure = fromPressure + (toPressure - fromPressure) * t;
    const nextPressure = fromPressure + (toPressure - fromPressure) * nextT;
    const avgPressure = (currentPressure + nextPressure) / 2;
    
    // Pressure 0.35 (light) to 1.0 (full) maps to brush size 40% to 150%
    const pressureSize = baseBrushSize * (0.4 + avgPressure * 1.1);
    
    const x = fromX + dx * t;
    const y = fromY + dy * t;
    const nextX = fromX + dx * nextT;
    const nextY = fromY + dy * nextT;
    
    stampLine(ctx, x, y, nextX, nextY, pressureSize, color, opacity);
  }
  
  ctx.restore();
}

export function drawLine(ctx, fromX, fromY, toX, toY, brushSize, color, opacity = 1) {
  stampLine(ctx, fromX, fromY, toX, toY, brushSize, color, opacity);
}

export function drawBrush(ctx, x, y, size, color, opacity = 1) {
  stampLine(ctx, x, y, x, y, size, color, opacity);
}

export function erase(ctx, x, y, size) {
  ctx.save();
  ctx.clearRect(x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

export function drawRect(ctx, x1, y1, x2, y2, color, brushSize = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, brushSize);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.rect(x1, y1, x2 - x1, y2 - y1);
  ctx.stroke();
  ctx.restore();
}

export function fillBucket(ctx, imageData, startX, startY, fillColor) {
  // Simple flood fill implementation
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  const fillRGB = hexToRGB(fillColor);
  const visited = new Set();
  const queue = [[startX, startY]];
  
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const idx = (y * width + x) * 4;
    
    if (visited.has(`${x},${y}`) || x < 0 || x >= width || y < 0 || y >= height) continue;
    visited.add(`${x},${y}`);
    
    // Set pixel to fill color
    data[idx] = fillRGB.r;
    data[idx + 1] = fillRGB.g;
    data[idx + 2] = fillRGB.b;
    data[idx + 3] = 255;
    
    // Add neighbors to queue
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return imageData;
}

export function hexToRGB(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}
