import { useMemo, useState } from 'react';
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from '../utils/colorUtils';
import type { HSV } from '../types';

interface UseColorPickerReturn {
  brushColor: string;
  hsv: HSV;
  setBrushColor: (color: string) => void;
  handleHueChange: (value: number) => void;
  handleSaturationChange: (value: number) => void;
  handleValueChange: (value: number) => void;
}

export const useColorPicker = (initialColor = '#4AA3DF'): UseColorPickerReturn => {
  const [brushColor, setBrushColor] = useState(initialColor);
  const hsv = useMemo(() => rgbToHsv(hexToRgb(brushColor)), [brushColor]);

  const updateFromHsv = (next: HSV) => setBrushColor(rgbToHex(hsvToRgb(next)));

  return {
    brushColor,
    hsv,
    setBrushColor,
    handleHueChange: (value) => updateFromHsv({ ...hsv, h: value }),
    handleSaturationChange: (value) => updateFromHsv({ ...hsv, s: value }),
    handleValueChange: (value) => updateFromHsv({ ...hsv, v: value }),
  };
};
