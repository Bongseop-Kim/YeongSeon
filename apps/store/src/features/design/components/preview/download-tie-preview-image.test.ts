// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadTiePreviewImage } from "@/features/design/components/preview/download-tie-preview-image";

const drawImage = vi.fn();
const getContext = vi.fn();
const toBlob = vi.fn();
const click = vi.fn();

const createImage = (width: number, height: number) =>
  ({
    naturalWidth: width,
    naturalHeight: height,
    complete: true,
    decode: vi.fn().mockResolvedValue(undefined),
    onload: null,
    onerror: null,
    set src(_value: string) {},
    get src() {
      return "";
    },
  }) as unknown as HTMLImageElement;

describe("downloadTiePreviewImage", () => {
  beforeEach(() => {
    drawImage.mockClear();
    getContext.mockReset();
    toBlob.mockReset();
    click.mockClear();

    const context = {
      drawImage,
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      set globalCompositeOperation(_value: string) {},
    };
    getContext.mockReturnValue(context);
    toBlob.mockImplementation((callback: BlobCallback) => {
      callback(new Blob(["png"], { type: "image/png" }));
    });

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext,
          toBlob,
        } as unknown as HTMLCanvasElement;
      }

      if (tagName === "a") {
        return {
          href: "",
          download: "",
          click,
        } as unknown as HTMLAnchorElement;
      }

      return document.createElement(tagName);
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:download"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(globalThis, "Image").mockImplementation(
      () => createImage(100, 100) as HTMLImageElement,
    );
  });

  it("반복 타일 다운로드는 35px 크기로 캔버스 전체를 채운다", async () => {
    await downloadTiePreviewImage({
      imageUrl: 'url("https://example.com/repeat.webp") center/cover no-repeat',
      repeatTileUrl: "https://example.com/repeat.webp",
      unmasked: true,
      filename: "design.png",
    });

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 35, 35);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 280, 595, 35, 35);
    expect(click).toHaveBeenCalledOnce();
  });
});
