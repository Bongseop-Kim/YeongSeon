export const MAX_MASK_BASE64_LENGTH = 5_000_000;

interface RescaleTarget {
  width: number;
  height: number;
}

export async function rescaleMaskToTarget(
  source: HTMLCanvasElement | ImageBitmap,
  target: RescaleTarget,
): Promise<HTMLCanvasElement> {
  const output = document.createElement("canvas");
  output.width = target.width;
  output.height = target.height;

  const context = output.getContext("2d");
  if (!context) {
    throw new Error("2d-context-unavailable");
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(
    source as CanvasImageSource,
    0,
    0,
    target.width,
    target.height,
  );

  const image = context.getImageData(0, 0, target.width, target.height);
  const { data } = image;

  for (let index = 0; index < data.length; index += 4) {
    const value = data[index] > 127 ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  context.putImageData(image, 0, 0);
  return output;
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("mask_blob_creation_failed"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export async function canvasToPngBase64(
  canvas: HTMLCanvasElement,
): Promise<string> {
  const blob = await canvasToPngBlob(canvas);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("mask_blob_read_failed"));
        return;
      }

      resolve(result.split(",")[1] ?? "");
    };

    reader.onerror = () => reject(new Error("mask_blob_read_failed"));
    reader.readAsDataURL(blob);
  });
}
