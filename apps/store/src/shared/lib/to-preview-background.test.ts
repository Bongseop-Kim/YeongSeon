import { describe, expect, it } from "vitest";
import {
  getRawImageUrlFromPreviewBackground,
  toPreviewBackground,
} from "@/shared/lib/to-preview-background";

describe("getRawImageUrlFromPreviewBackground", () => {
  it("escapeCssUrl로 이스케이프된 따옴표와 백슬래시를 원래 URL로 복원한다", () => {
    const rawUrl = 'https://example.com/path/"quote"\\image.webp';
    const background = toPreviewBackground(rawUrl);

    expect(getRawImageUrlFromPreviewBackground(background)).toBe(rawUrl);
  });
});
