import { describe, expect, it } from 'vitest';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '../utils/colorUtils';

describe('hexToRgb', () => {
  it('converts a 6-digit hex to RGB', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('expands 3-digit shorthand hex', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('handles hex without leading #', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('converts a mid-range color correctly', () => {
    expect(hexToRgb('#7f7f7f')).toEqual({ r: 127, g: 127, b: 127 });
  });
});

describe('rgbToHex', () => {
  it('converts RGB to lowercase hex with leading #', () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00');
    expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
  });

  it('pads single-digit hex values', () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203');
  });

  it('is the inverse of hexToRgb', () => {
    const original = '#a1b2c3';
    expect(rgbToHex(hexToRgb(original))).toBe(original);
  });
});

describe('rgbToHsv', () => {
  it('black → h=0, s=0, v=0', () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('white → h=0, s=0, v=100', () => {
    expect(rgbToHsv({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, v: 100 });
  });

  it('pure red → h=0, s=100, v=100', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 });
  });

  it('pure green → h=120, s=100, v=100', () => {
    expect(rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, v: 100 });
  });

  it('pure blue → h=240, s=100, v=100', () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, v: 100 });
  });
});

describe('hsvToRgb', () => {
  it('h=0, s=100, v=100 → pure red', () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('h=120, s=100, v=100 → pure green', () => {
    expect(hsvToRgb({ h: 120, s: 100, v: 100 })).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('h=240, s=100, v=100 → pure blue', () => {
    expect(hsvToRgb({ h: 240, s: 100, v: 100 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('s=0 produces a grey', () => {
    const { r, g, b } = hsvToRgb({ h: 0, s: 0, v: 50 });
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(255);
  });

  it('v=0 produces black', () => {
    expect(hsvToRgb({ h: 180, s: 100, v: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('is approximate inverse of rgbToHsv', () => {
    const rgb = { r: 100, g: 150, b: 200 };
    const back = hsvToRgb(rgbToHsv(rgb));
    expect(back.r).toBeCloseTo(rgb.r, -1);
    expect(back.g).toBeCloseTo(rgb.g, -1);
    expect(back.b).toBeCloseTo(rgb.b, -1);
  });
});
