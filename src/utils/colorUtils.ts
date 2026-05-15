import type { HSV, RGB } from '../types';

export const hexToRgb = (hex: string): RGB => {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  const int = parseInt(value, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};

export const rgbToHex = ({ r, g, b }: RGB): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const rgbToHsv = ({ r, g, b }: RGB): HSV => {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  let h = 0;

  if (delta > 0) {
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h,
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  };
};

export const hsvToRgb = ({ h, s, v }: HSV): RGB => {
  const hh = h % 360;
  const ss = s / 100;
  const vv = v / 100;
  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;
  let rr = 0, gg = 0, bb = 0;

  if (hh < 60) { rr = c; gg = x; }
  else if (hh < 120) { rr = x; gg = c; }
  else if (hh < 180) { gg = c; bb = x; }
  else if (hh < 240) { gg = x; bb = c; }
  else if (hh < 300) { rr = x; bb = c; }
  else { rr = c; bb = x; }

  return {
    r: Math.round((rr + m) * 255),
    g: Math.round((gg + m) * 255),
    b: Math.round((bb + m) * 255),
  };
};
