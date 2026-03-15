import { describe, expect, it } from "vitest";
import { normalizeReferenceImages, toDbImageRef } from "@/mappers/image-mapper";

describe("normalizeReferenceImages", () => {
  it("중복 URL은 제거하고 공백은 정규화한다", () => {
    expect(
      normalizeReferenceImages([
        { url: " https://example.com/a.jpg ", fileId: "" },
        { url: "https://example.com/a.jpg", fileId: "" },
        { url: "https://example.com/b.jpg", fileId: "file-b" },
      ]),
    ).toEqual([
      { url: "https://example.com/a.jpg", fileId: "" },
      { url: "https://example.com/b.jpg", fileId: "file-b" },
    ]);
  });

  it("기존 항목에 fileId가 없으면 뒤에서 온 fileId를 병합한다", () => {
    expect(
      normalizeReferenceImages([
        { url: "https://example.com/a.jpg", fileId: "" },
        { url: "https://example.com/a.jpg", fileId: "file-a" },
      ]),
    ).toEqual([{ url: "https://example.com/a.jpg", fileId: "file-a" }]);
  });

  it("빈 URL은 무시한다", () => {
    expect(
      normalizeReferenceImages([
        { url: " ", fileId: "ignored" },
        { url: "", fileId: "ignored" },
      ]),
    ).toEqual([]);
  });
});

describe("toDbImageRef", () => {
  it("fileId 공백을 null로 정규화한다", () => {
    expect(
      toDbImageRef({
        url: "https://example.com/a.jpg",
        fileId: " ",
      }),
    ).toEqual({
      url: "https://example.com/a.jpg",
      file_id: null,
    });
  });
});
