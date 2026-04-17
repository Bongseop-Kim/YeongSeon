import { createCanvas, loadImage } from "canvas";

const DRAW_IMAGE_PATCHED = Symbol("drawImagePatched");
type SupportedMimeType = "image/png" | "image/jpeg";

if (typeof globalThis.OffscreenCanvas === "undefined") {
  // @ts-expect-error - node test env polyfill
  globalThis.OffscreenCanvas = class {
    width: number;
    height: number;
    private readonly canvas: ReturnType<typeof createCanvas>;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.canvas = createCanvas(width, height);
    }

    getContext(type: string) {
      if (type !== "2d") {
        return null;
      }

      const ctx = this.canvas.getContext("2d");
      if (!(DRAW_IMAGE_PATCHED in ctx)) {
        const original = ctx.drawImage.bind(ctx);
        ctx.drawImage = (image: unknown, ...args: unknown[]) =>
          (original as (src: unknown, ...rest: unknown[]) => void)(
            (image as { _image?: unknown })?._image ?? image,
            ...args,
          );
        Object.defineProperty(ctx, DRAW_IMAGE_PATCHED, {
          value: true,
          configurable: false,
          enumerable: false,
          writable: false,
        });
      }
      return ctx;
    }

    async convertToBlob(options?: { type?: SupportedMimeType }) {
      const mimeType: SupportedMimeType =
        options?.type === "image/jpeg" ? "image/jpeg" : "image/png";
      const buffer =
        mimeType === "image/jpeg"
          ? this.canvas.toBuffer("image/jpeg")
          : this.canvas.toBuffer("image/png");
      return new Blob([new Uint8Array(buffer)], { type: mimeType });
    }
  };
}

if (typeof globalThis.createImageBitmap === "undefined") {
  // @ts-expect-error - node test env polyfill
  globalThis.createImageBitmap = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const image = await loadImage(buffer);

    return {
      width: image.width,
      height: image.height,
      _image: image,
      close() {},
    };
  };
}
