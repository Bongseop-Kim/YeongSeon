export interface MeasureSeamlessInput {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  stripWidth: number;
}

export interface MeasureSeamlessResult {
  horizontalDeltaE: number;
  verticalDeltaE: number;
}

export interface FeatherInput {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  featherWidth: number;
}

export interface VerifySeamlessInput {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  stripWidth?: number;
}

export interface VerifySeamlessResult extends MeasureSeamlessResult {
  status: "pass" | "corrected" | "reject";
  correctedPixels?: Uint8ClampedArray;
}

const SEAMLESS_PASS_THRESHOLD = 5;
const SEAMLESS_UNRECOVERABLE_THRESHOLD = 10;
const DEFAULT_STRIP_WIDTH = 24;

export function measureSeamlessDelta(
  input: MeasureSeamlessInput,
): MeasureSeamlessResult {
  const { pixels, width, height, stripWidth } = input;
  validatePixelsInput(pixels, width, height);
  validateWindowSize("stripWidth", stripWidth, Math.min(width, height));
  const leftStrip = extractStrip(pixels, width, height, {
    x: 0,
    width: stripWidth,
    fullHeight: true,
  });
  const rightStrip = reverseStrip(
    extractStrip(pixels, width, height, {
      x: width - stripWidth,
      width: stripWidth,
      fullHeight: true,
    }),
    { rowLength: stripWidth, reverseRows: true },
  );
  const topStrip = extractStrip(pixels, width, height, {
    y: 0,
    height: stripWidth,
    fullWidth: true,
  });
  const bottomStrip = reverseStrip(
    extractStrip(pixels, width, height, {
      y: height - stripWidth,
      height: stripWidth,
      fullWidth: true,
    }),
    { rowLength: width, reverseRowOrder: true },
  );

  return {
    horizontalDeltaE: averageDeltaE(leftStrip, rightStrip),
    verticalDeltaE: averageDeltaE(topStrip, bottomStrip),
  };
}

export function applyEdgeFeather(input: FeatherInput): Uint8ClampedArray {
  validatePixelsInput(input.pixels, input.width, input.height);
  validateWindowSize(
    "featherWidth",
    input.featherWidth,
    Math.min(input.width, input.height),
  );
  const output = new Uint8ClampedArray(input.pixels);
  const { width, height, featherWidth } = input;

  for (let y = 0; y < height; y += 1) {
    for (let offset = 0; offset < featherWidth; offset += 1) {
      const leftIndex = (y * width + offset) * 4;
      const rightIndex = (y * width + (width - 1 - offset)) * 4;
      const blendRatio = (featherWidth - offset) / (2 * featherWidth);
      blendPixels(output, leftIndex, rightIndex, blendRatio);
    }
  }

  for (let x = 0; x < width; x += 1) {
    for (let offset = 0; offset < featherWidth; offset += 1) {
      const topIndex = (offset * width + x) * 4;
      const bottomIndex = ((height - 1 - offset) * width + x) * 4;
      const blendRatio = (featherWidth - offset) / (2 * featherWidth);
      blendPixels(output, topIndex, bottomIndex, blendRatio);
    }
  }

  return output;
}

export function verifySeamlessTile(
  input: VerifySeamlessInput,
): VerifySeamlessResult {
  const dimensionLimit = Math.min(input.width, input.height);
  const stripWidth = Math.max(
    1,
    Math.min(
      input.stripWidth ?? DEFAULT_STRIP_WIDTH,
      Math.floor(dimensionLimit / 2),
    ),
  );
  const first = measureSeamlessDelta({
    pixels: input.pixels,
    width: input.width,
    height: input.height,
    stripWidth,
  });
  const maxFirst = Math.max(first.horizontalDeltaE, first.verticalDeltaE);

  if (maxFirst < SEAMLESS_PASS_THRESHOLD) {
    return { status: "pass", ...first };
  }

  // Large edge deltas are rejected immediately instead of attempting recovery.
  if (maxFirst >= SEAMLESS_UNRECOVERABLE_THRESHOLD) {
    return { status: "reject", ...first };
  }

  const correctedPixels = applyEdgeFeather({
    pixels: input.pixels,
    width: input.width,
    height: input.height,
    featherWidth: stripWidth,
  });
  const second = measureSeamlessDelta({
    pixels: correctedPixels,
    width: input.width,
    height: input.height,
    stripWidth,
  });

  if (
    Math.max(second.horizontalDeltaE, second.verticalDeltaE) <
    SEAMLESS_PASS_THRESHOLD
  ) {
    return { status: "corrected", correctedPixels, ...second };
  }

  return { status: "reject", correctedPixels, ...second };
}

type ExtractStripOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fullWidth?: boolean;
  fullHeight?: boolean;
};

type ReverseStripOptions = {
  rowLength: number;
  reverseRows?: boolean;
  reverseRowOrder?: boolean;
};

function validatePixelsInput(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("width and height must be positive integers");
  }

  if (pixels.length !== width * height * 4) {
    throw new Error("pixels length must equal width * height * 4");
  }
}

function validateWindowSize(
  fieldName: "stripWidth" | "featherWidth",
  value: number,
  dimensionLimit: number,
): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  const maxAllowed = Math.floor(dimensionLimit / 2);
  if (value > maxAllowed) {
    throw new Error(
      `${fieldName} must not exceed half the image dimension (${maxAllowed})`,
    );
  }
}

function extractStrip(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: ExtractStripOptions,
): number[][] {
  const startX = options.fullWidth ? 0 : (options.x ?? 0);
  const endX = options.fullWidth ? width : startX + (options.width ?? 0);
  const startY = options.fullHeight ? 0 : (options.y ?? 0);
  const endY = options.fullHeight ? height : startY + (options.height ?? 0);
  const strip: number[][] = [];

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = (y * width + x) * 4;
      strip.push([pixels[index], pixels[index + 1], pixels[index + 2]]);
    }
  }

  return strip;
}

function reverseStrip(
  strip: number[][],
  options: ReverseStripOptions,
): number[][] {
  const { rowLength } = options;
  const numRows = strip.length / rowLength;
  const result: number[][] = new Array(strip.length);

  for (let r = 0; r < numRows; r += 1) {
    const srcRow = options.reverseRowOrder ? numRows - 1 - r : r;

    for (let c = 0; c < rowLength; c += 1) {
      const srcCol = options.reverseRows ? rowLength - 1 - c : c;
      result[r * rowLength + c] = strip[srcRow * rowLength + srcCol];
    }
  }

  return result;
}

function averageDeltaE(left: number[][], right: number[][]): number {
  const count = Math.min(left.length, right.length);
  let total = 0;

  for (let index = 0; index < count; index += 1) {
    total += deltaE2000(rgbToLab(left[index]), rgbToLab(right[index]));
  }

  return count === 0 ? 0 : total / count;
}

function blendPixels(
  pixels: Uint8ClampedArray,
  firstIndex: number,
  secondIndex: number,
  blendRatio: number,
): void {
  for (let channel = 0; channel < 3; channel += 1) {
    const first = pixels[firstIndex + channel];
    const second = pixels[secondIndex + channel];
    const leftBlend = first * (1 - blendRatio) + second * blendRatio;
    const rightBlend = second * (1 - blendRatio) + first * blendRatio;

    pixels[firstIndex + channel] = leftBlend;
    pixels[secondIndex + channel] = rightBlend;
  }
}

function rgbToLab(rgb: number[]): [number, number, number] {
  const srgbToLinear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };

  const red = srgbToLinear(rgb[0]);
  const green = srgbToLinear(rgb[1]);
  const blue = srgbToLinear(rgb[2]);

  const x = red * 0.4124564 + green * 0.3575761 + blue * 0.1804375;
  const y = red * 0.2126729 + green * 0.7151522 + blue * 0.072175;
  const z = red * 0.0193339 + green * 0.119192 + blue * 0.9503041;

  const xn = 0.95047;
  const yn = 1;
  const zn = 1.08883;
  const labTransform = (value: number): number =>
    value > 216 / 24389 ? Math.cbrt(value) : ((value * 24389) / 27 + 16) / 116;

  const fx = labTransform(x / xn);
  const fy = labTransform(y / yn);
  const fz = labTransform(z / zn);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE2000(
  firstLab: [number, number, number],
  secondLab: [number, number, number],
): number {
  const [l1, a1, b1] = firstLab;
  const [l2, a2, b2] = secondLab;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const averageC = (c1 + c2) / 2;
  const g =
    0.5 *
    (1 -
      Math.sqrt(
        Math.pow(averageC, 7) / (Math.pow(averageC, 7) + Math.pow(25, 7)),
      ));

  const a1Prime = (1 + g) * a1;
  const a2Prime = (1 + g) * a2;
  const c1Prime = Math.hypot(a1Prime, b1);
  const c2Prime = Math.hypot(a2Prime, b2);

  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const h1Prime =
    c1Prime === 0 ? 0 : (toDegrees(Math.atan2(b1, a1Prime)) + 360) % 360;
  const h2Prime =
    c2Prime === 0 ? 0 : (toDegrees(Math.atan2(b2, a2Prime)) + 360) % 360;

  const deltaLPrime = l2 - l1;
  const deltaCPrime = c2Prime - c1Prime;

  let deltaHPrime: number;
  if (c1Prime * c2Prime === 0) {
    deltaHPrime = 0;
  } else if (Math.abs(h2Prime - h1Prime) <= 180) {
    deltaHPrime = h2Prime - h1Prime;
  } else if (h2Prime > h1Prime) {
    deltaHPrime = h2Prime - h1Prime - 360;
  } else {
    deltaHPrime = h2Prime - h1Prime + 360;
  }

  const deltaBigHPrime =
    2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(toRadians(deltaHPrime) / 2);
  const averageLPrime = (l1 + l2) / 2;
  const averageCPrime = (c1Prime + c2Prime) / 2;

  let averageHPrime: number;
  if (c1Prime * c2Prime === 0) {
    averageHPrime = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180) {
    averageHPrime = (h1Prime + h2Prime) / 2;
  } else if (h1Prime + h2Prime < 360) {
    averageHPrime = (h1Prime + h2Prime + 360) / 2;
  } else {
    averageHPrime = (h1Prime + h2Prime - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos(toRadians(averageHPrime - 30)) +
    0.24 * Math.cos(toRadians(2 * averageHPrime)) +
    0.32 * Math.cos(toRadians(3 * averageHPrime + 6)) -
    0.2 * Math.cos(toRadians(4 * averageHPrime - 63));

  const deltaTheta = 30 * Math.exp(-Math.pow((averageHPrime - 275) / 25, 2));
  const rotationComponent =
    2 *
    Math.sqrt(
      Math.pow(averageCPrime, 7) /
        (Math.pow(averageCPrime, 7) + Math.pow(25, 7)),
    );
  const lightnessWeight =
    1 +
    (0.015 * Math.pow(averageLPrime - 50, 2)) /
      Math.sqrt(20 + Math.pow(averageLPrime - 50, 2));
  const chromaWeight = 1 + 0.045 * averageCPrime;
  const hueWeight = 1 + 0.015 * averageCPrime * t;
  const rotationTerm = -Math.sin(toRadians(2 * deltaTheta)) * rotationComponent;

  return Math.sqrt(
    Math.pow(deltaLPrime / lightnessWeight, 2) +
      Math.pow(deltaCPrime / chromaWeight, 2) +
      Math.pow(deltaBigHPrime / hueWeight, 2) +
      rotationTerm *
        (deltaCPrime / chromaWeight) *
        (deltaBigHPrime / hueWeight),
  );
}
