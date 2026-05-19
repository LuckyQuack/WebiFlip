export const pressureCache = new Map<number, number>();
export const tiltCache = new Map<number, number>();
export const activePointers = new Map<number, unknown>();

export let usePressureSize = true;
export let usePressureOpacity = false;
export let usePressureTilt = false;

export let brushSize = 3;
export let autofill = false;

export let textEntryActive = false;
export let textEntryX = 0;
export let textEntryY = 0;
export let textEntryEditId: string | null = null;
export let textEntryNextId = 1;
export let eraseStrokeBounds: DOMRect | null = null;

export let trailPoints: { x: number; y: number }[] = [];
export let rectToolStart: { x: number; y: number } | null = null;
export let rectToolPreview: { x: number; y: number } | null = null;
export let lineToolStart: { x: number; y: number } | null = null;
export let lineToolPreview: { x: number; y: number } | null = null;

export const PRESSURE_MIN = 0.05;
export let penDetected = false;
export let stabilizationLevel = 5;
export let pressureSmooth = 0.45;
export let strokeSmooth = 0.6;

let lastPt: { x: number; y: number } | null = null;
let stabilizedPt: { x: number; y: number } | null = null;
let isDrawing = false;
let isPanning = false;

export let panStart = { x: 0, y: 0, ox: 0, oy: 0 };

export function pressure(e: PointerEvent | null): number {
  const pid = Number.isFinite(e?.pointerId) ? e!.pointerId : -1;
  const isPen = e?.pointerType === 'pen';
  const raw = typeof e?.pressure === 'number' && e.pressure > 0 ? e.pressure : isPen ? 0.35 : 1;
  const prev = pressureCache.has(pid) ? pressureCache.get(pid)! : raw;
  const smoothed = prev + (raw - prev) * pressureSmooth;
  const out = Math.max(PRESSURE_MIN, Math.min(1, smoothed));
  pressureCache.set(pid, out);
  return out;
}

export function tiltAmount(e: PointerEvent | null): number {
  const pid = Number.isFinite(e?.pointerId) ? e!.pointerId : -1;
  if (e?.pointerType !== 'pen') {
    tiltCache.set(pid, 0);
    return 0;
  }
  const tx = Number.isFinite(e?.tiltX) ? e!.tiltX : 0;
  const ty = Number.isFinite(e?.tiltY) ? e!.tiltY : 0;
  const raw = Math.max(0, Math.min(1, Math.hypot(tx, ty) / 90));
  const prev = tiltCache.has(pid) ? tiltCache.get(pid)! : raw;
  const smoothed = prev + (raw - prev) * 0.35;
  const out = Math.max(0, Math.min(1, smoothed));
  tiltCache.set(pid, out);
  return out;
}

export function pressureSmoothFromLevel(level: number): number {
  const lv = Math.max(0, Math.min(10, Number(level) || 0));
  return Math.max(0.2, Math.min(1, 1 - lv * 0.08));
}

export function strokeSmoothFromLevel(level: number): number {
  const lv = Math.max(0, Math.min(10, Number(level) || 0));
  return Math.max(0.2, Math.min(1, 1 - lv * 0.08));
}

export function notePenDetected(e: PointerEvent | null): void {
  if (!e || e.pointerType !== 'pen') return;
  if (penDetected) return;
  penDetected = true;
}

export function shouldStabilizeTool(tool: string): boolean {
  return tool === 'brush' || tool === 'eraser';
}

export function stabilizePoint(tool: string, _e: unknown, x: number, y: number): { x: number; y: number } {
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

export function resetStabilizedPt(): void {
  stabilizedPt = null;
}

export function getIsDrawing(): boolean { return isDrawing; }
export function setIsDrawing(value: boolean): void { isDrawing = value; }
export function getIsPanning(): boolean { return isPanning; }
export function setIsPanning(value: boolean): void { isPanning = value; }
export function getLastPt(): { x: number; y: number } | null { return lastPt; }
export function setLastPt(pt: { x: number; y: number } | null): void { lastPt = pt; }

const brushStampCache = new Map<string, { canvas: HTMLCanvasElement; ox: number; oy: number; size: number }>();

function getBrushStamp(size: number, color: string) {
  const cacheKey = `circle|${Math.round(size)}|${color}`;
  if (brushStampCache.has(cacheKey)) return brushStampCache.get(cacheKey)!;

  const dim = Math.ceil(size);
  const canvas = document.createElement('canvas');
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(dim / 2, dim / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const stamp = { canvas, ox: dim / 2, oy: dim / 2, size };
  brushStampCache.set(cacheKey, stamp);
  return stamp;
}

export function clearBrushStampCache(): void {
  brushStampCache.clear();
}

export function stampLine(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  brushSize: number, color: string, opacity = 1
): void {
  const stamp = getBrushStamp(brushSize, color);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(1, brushSize * 0.5);
  const numStamps = Math.max(1, Math.ceil(dist / step));

  ctx.save();
  ctx.globalAlpha = opacity;
  for (let i = 0; i <= numStamps; i++) {
    const t = numStamps > 0 ? i / numStamps : 0;
    const px = x0 + dx * t - stamp.ox;
    const py = y0 + dy * t - stamp.oy;
    ctx.drawImage(stamp.canvas, Math.round(px), Math.round(py));
  }
  ctx.restore();
}

export function drawPressureLine(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number, toX: number, toY: number,
  baseBrushSize: number, fromPressure: number, toPressure: number,
  color: string, opacity = 1
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  const numSegments = Math.max(1, Math.ceil(distance));

  ctx.save();
  for (let i = 0; i < numSegments; i++) {
    const t = numSegments > 1 ? i / numSegments : 0;
    const nextT = numSegments > 1 ? (i + 1) / numSegments : 1;
    const avgPressure = (fromPressure + (toPressure - fromPressure) * ((t + nextT) / 2));
    const pressureSize = baseBrushSize * (0.4 + avgPressure * 1.1);
    stampLine(ctx, fromX + dx * t, fromY + dy * t, fromX + dx * nextT, fromY + dy * nextT, pressureSize, color, opacity);
  }
  ctx.restore();
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number, toX: number, toY: number,
  brushSize: number, color: string, opacity = 1
): void {
  stampLine(ctx, fromX, fromY, toX, toY, brushSize, color, opacity);
}

export function drawBrush(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, opacity = 1): void {
  stampLine(ctx, x, y, x, y, size, color, opacity);
}

export function erase(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.clearRect(x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

export function drawRect(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, brushSize = 1): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, brushSize);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.rect(x1, y1, x2 - x1, y2 - y1);
  ctx.stroke();
  ctx.restore();
}

// ---- Realistic pen tool: velocity-based width + Bezier smoothing ----

const _penVelCache = new Map<number, number>();
const _penTimeCache = new Map<number, number>();
const _penPosCache = new Map<number, { x: number; y: number }>();
const PEN_MAX_SPEED = 500; // px/s at which stroke reaches its thinnest

export function resetPenVelocity(pointerId: number): void {
  _penVelCache.delete(pointerId);
  _penTimeCache.delete(pointerId);
  _penPosCache.delete(pointerId);
}

export function trackPenVelocity(pointerId: number, x: number, y: number): number {
  const now = performance.now();
  const prevTime = _penTimeCache.get(pointerId);
  const prevPos = _penPosCache.get(pointerId);
  _penTimeCache.set(pointerId, now);
  _penPosCache.set(pointerId, { x, y });
  if (prevTime === undefined || !prevPos) return 0;
  const dt = Math.max(1, now - prevTime);
  const speed = Math.hypot(x - prevPos.x, y - prevPos.y) / dt * 1000;
  const raw = Math.min(1, speed / PEN_MAX_SPEED);
  const prev = _penVelCache.get(pointerId) ?? 0;
  const v = prev * 0.7 + raw * 0.3;
  _penVelCache.set(pointerId, v);
  return v;
}

export interface PenPoint { x: number; y: number; r: number; }

/** Returns the stroke radius from base size, pressure, velocity, and taper (0–1). */
export function penRadius(baseSize: number, press: number, velocity: number, taperT: number): number {
  const velFactor = 1 - velocity * 0.6; // fast movement thins the stroke
  const pressFactor = 0.22 + press * 0.9;
  return Math.max(0.25, (baseSize / 2) * pressFactor * velFactor * taperT);
}

export function drawPenDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.25, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw a smooth quadratic Bezier segment through midpoints of p0→p1 and p1→p2, with interpolated radius. */
export function drawPenBezier(
  ctx: CanvasRenderingContext2D,
  p0: PenPoint, p1: PenPoint, p2: PenPoint,
  color: string,
): void {
  const m0x = (p0.x + p1.x) / 2;
  const m0y = (p0.y + p1.y) / 2;
  const m1x = (p1.x + p2.x) / 2;
  const m1y = (p1.y + p2.y) / 2;
  const dist = Math.hypot(m1x - m0x, m1y - m0y);
  if (dist < 0.01) {
    if (p2.r > 0.25) drawPenDot(ctx, p2.x, p2.y, p2.r, color);
    return;
  }
  const avgR = (p0.r + p2.r) / 2;
  const step = Math.max(0.3, avgR * 0.15);
  const numSteps = Math.max(1, Math.ceil(dist / step));
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const it = 1 - t;
    const bx = it * it * m0x + 2 * it * t * p1.x + t * t * m1x;
    const by = it * it * m0y + 2 * it * t * p1.y + t * t * m1y;
    const r = Math.max(0.25, p0.r + (p2.r - p0.r) * t);
    ctx.moveTo(bx + r, by);
    ctx.arc(bx, by, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/** Draw a straight pen segment between two points with interpolated radius. */
export function drawPenLine(
  ctx: CanvasRenderingContext2D,
  p0: PenPoint, p1: PenPoint,
  color: string,
): void {
  const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const avgR = (p0.r + p1.r) / 2;
  const step = Math.max(0.3, avgR * 0.15);
  const numSteps = Math.max(1, Math.ceil(dist / step));
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;
    const r = Math.max(0.25, p0.r + (p1.r - p0.r) * t);
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}
