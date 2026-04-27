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

  it("single-quoted url 값을 복원한다", () => {
    const rawUrl = "https://example.com/path/'quote'\\image.webp";
    const background = `url('${rawUrl.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}') center/cover no-repeat`;

    expect(getRawImageUrlFromPreviewBackground(background)).toBe(rawUrl);
  });

  it("따옴표 없는 url 값을 복원한다", () => {
    expect(
      getRawImageUrlFromPreviewBackground(
        "url(https://example.com/image.webp) center/cover no-repeat",
      ),
    ).toBe("https://example.com/image.webp");
  });

  it("null, undefined, empty string은 null을 반환한다", () => {
    expect(getRawImageUrlFromPreviewBackground(null)).toBeNull();
    expect(getRawImageUrlFromPreviewBackground(undefined)).toBeNull();
    expect(getRawImageUrlFromPreviewBackground("")).toBeNull();
    expect(getRawImageUrlFromPreviewBackground("   ")).toBeNull();
  });

  it("빈 url capture는 빈 문자열로 복원한다", () => {
    expect(getRawImageUrlFromPreviewBackground('url("")')).toBe("");
  });

  it("url 형식이 아닌 문자열은 trim된 원문을 반환한다", () => {
    expect(getRawImageUrlFromPreviewBackground("  plain-value  ")).toBe(
      "plain-value",
    );
  });
});
