import type { TileOutput } from "@/functions/_shared/tile-pipeline/canvas-renderer.ts";

export interface ComposeTiledInput {
  tile: TileOutput;
  canvasWidth: number;
  canvasHeight: number;
  tileSize: number;
  gap: number;
  gapColor?: string;
}

export function composeTiled(input: ComposeTiledInput): TileOutput {
  const pixels = new Uint8ClampedArray(
    input.canvasWidth * input.canvasHeight * 4,
  );
  const [red, green, blue] = hexToRgb(input.gapColor ?? "#ffffff");

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = 255;
  }

  const step = input.tileSize + input.gap;
  const columns = Math.floor((input.canvasWidth + input.gap) / step);
  const rows = Math.floor((input.canvasHeight + input.gap) / step);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      blitScaled(
        input.tile,
        pixels,
        input.canvasWidth,
        input.canvasHeight,
        column * step,
        row * step,
        input.tileSize,
      );
    }
  }

  return {
    pixels,
    width: input.canvasWidth,
    height: input.canvasHeight,
  };
}

function blitScaled(
  tile: TileOutput,
  destination: Uint8ClampedArray,
  destinationWidth: number,
  destinationHeight: number,
  originX: number,
  originY: number,
  size: number,
): void {
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) {
      const sourceX = Math.floor((dx / size) * tile.width);
      const sourceY = Math.floor((dy / size) * tile.height);
      const destinationX = originX + dx;
      const destinationY = originY + dy;

      if (
        destinationX >= destinationWidth ||
        destinationY >= destinationHeight
      ) {
        continue;
      }

      const sourceIndex = (sourceY * tile.width + sourceX) * 4;
      const destinationIndex =
        (destinationY * destinationWidth + destinationX) * 4;

      destination[destinationIndex] = tile.pixels[sourceIndex];
      destination[destinationIndex + 1] = tile.pixels[sourceIndex + 1];
      destination[destinationIndex + 2] = tile.pixels[sourceIndex + 2];
      destination[destinationIndex + 3] = tile.pixels[sourceIndex + 3];
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}
