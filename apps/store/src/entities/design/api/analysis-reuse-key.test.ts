import { describe, expect, it } from "vitest";
import { buildAnalysisReuseKey } from "@/entities/design/api/analysis-reuse-key";

const baseInput = {
  colors: ["#111", "#222"],
  pattern: "stripe",
  fabricMethod: "woven",
  ciPlacement: "all-over",
  baseImageWorkId: "work-1",
  ciImageHash: "abc",
  referenceImageHash: null,
  baseImageUrl: "https://example.com/x.png",
} as const;

describe("buildAnalysisReuseKey", () => {
  it("동일 입력은 동일 키를 생성한다", () => {
    expect(buildAnalysisReuseKey(baseInput)).toBe(
      buildAnalysisReuseKey(baseInput),
    );
  });

  it("colors 배열 순서가 달라지면 다른 키를 생성한다", () => {
    const reordered = { ...baseInput, colors: ["#222", "#111"] };
    expect(buildAnalysisReuseKey(reordered)).not.toBe(
      buildAnalysisReuseKey(baseInput),
    );
  });

  it("pattern이 달라지면 키가 달라진다", () => {
    expect(buildAnalysisReuseKey({ ...baseInput, pattern: "check" })).not.toBe(
      buildAnalysisReuseKey(baseInput),
    );
  });

  it("ci 이미지 해시가 달라지면 키가 달라진다", () => {
    expect(
      buildAnalysisReuseKey({ ...baseInput, ciImageHash: "xyz" }),
    ).not.toBe(buildAnalysisReuseKey(baseInput));
  });

  it("null/undefined 필드는 동일하게 취급한다", () => {
    const a = { ...baseInput, referenceImageHash: null };
    const b = { ...baseInput, referenceImageHash: undefined };

    expect(buildAnalysisReuseKey(a)).toBe(buildAnalysisReuseKey(b));
  });

  it("16진수 문자열을 반환한다", () => {
    expect(buildAnalysisReuseKey(baseInput)).toMatch(/^[0-9a-f]+$/);
  });
});
