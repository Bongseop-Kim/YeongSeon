import { encodePNG } from "jsr:@img/png@0.1.1";

export interface TileOutput {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface RenderSolidInput {
  size: number;
  color: string;
}

export interface RenderStripeInput {
  size: number;
  stripeWidthPx: number;
  colors: [string, string];
  orientation?: "vertical" | "horizontal" | "diagonal-45";
}

export interface RenderCheckInput {
  size: number;
  cellSize: number;
  colors: [string, string];
}

export function renderSolidTile(input: RenderSolidInput): TileOutput {
  const [red, green, blue] = hexToRgb(input.color);
  const pixels = new Uint8ClampedArray(input.size * input.size * 4);

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = 255;
  }

  return { pixels, width: input.size, height: input.size };
}

export function renderStripeTile(input: RenderStripeInput): TileOutput {
  const [firstColor, secondColor] = input.colors.map(hexToRgb);
  const pixels = new Uint8ClampedArray(input.size * input.size * 4);

  for (let y = 0; y < input.size; y += 1) {
    for (let x = 0; x < input.size; x += 1) {
      const stripeIndex = resolveStripeIndex(x, y, input);
      const [red, green, blue] = stripeIndex === 0 ? firstColor : secondColor;
      const pixelIndex = (y * input.size + x) * 4;
      pixels[pixelIndex] = red;
      pixels[pixelIndex + 1] = green;
      pixels[pixelIndex + 2] = blue;
      pixels[pixelIndex + 3] = 255;
    }
  }

  return { pixels, width: input.size, height: input.size };
}

export function renderCheckTile(input: RenderCheckInput): TileOutput {
  const [firstColor, secondColor] = input.colors.map(hexToRgb);
  const pixels = new Uint8ClampedArray(input.size * input.size * 4);

  for (let y = 0; y < input.size; y += 1) {
    for (let x = 0; x < input.size; x += 1) {
      const isEvenCell =
        (Math.floor(x / input.cellSize) + Math.floor(y / input.cellSize)) %
          2 ===
        0;
      const [red, green, blue] = isEvenCell ? firstColor : secondColor;
      const pixelIndex = (y * input.size + x) * 4;
      pixels[pixelIndex] = red;
      pixels[pixelIndex + 1] = green;
      pixels[pixelIndex + 2] = blue;
      pixels[pixelIndex + 3] = 255;
    }
  }

  return { pixels, width: input.size, height: input.size };
}

export async function encodeTileToPng(tile: TileOutput): Promise<Uint8Array> {
  return await encodePNG(tile.pixels, {
    width: tile.width,
    height: tile.height,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function resolveStripeIndex(
  x: number,
  y: number,
  input: RenderStripeInput,
): number {
  switch (input.orientation ?? "vertical") {
    case "horizontal":
      return Math.floor(y / input.stripeWidthPx) % 2;
    case "diagonal-45":
      return Math.floor((x + y) / input.stripeWidthPx) % 2;
    default:
      return Math.floor(x / input.stripeWidthPx) % 2;
  }
}
