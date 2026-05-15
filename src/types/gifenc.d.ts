declare module 'gifenc' {
  interface GifEncoder {
    writeFrame(
      pixels: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: number[][];
        delay?: number;
        repeat?: number;
        first?: boolean;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GifEncoder;
  export function quantize(
    rgba: Uint8Array,
    maxColors: number,
    options?: { format?: string }
  ): number[][];
  export function applyPalette(
    rgba: Uint8Array,
    palette: number[][],
    format?: string
  ): Uint8Array;
}
