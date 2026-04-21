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

  it.each([
    ["fabricMethod", { fabricMethod: "print" }],
    ["ciPlacement", { ciPlacement: "one-point" }],
    ["baseImageWorkId", { baseImageWorkId: "work-2" }],
    ["referenceImageHash", { referenceImageHash: "ref-1" }],
  ])("%s가 달라지면 키가 달라진다", (_label, overrides) => {
    expect(buildAnalysisReuseKey({ ...baseInput, ...overrides })).not.toBe(
      buildAnalysisReuseKey(baseInput),
    );
  });

  it("null/undefined 필드는 동일하게 취급한다", () => {
    const a = { ...baseInput, referenceImageHash: null };
    const b = { ...baseInput, referenceImageHash: undefined };

    expect(buildAnalysisReuseKey(a)).toBe(buildAnalysisReuseKey(b));
  });

  it("ciImageHash의 null/undefined도 동일하게 취급한다", () => {
    const a = { ...baseInput, ciImageHash: null };
    const b = { ...baseInput, ciImageHash: undefined };

    expect(buildAnalysisReuseKey(a)).toBe(buildAnalysisReuseKey(b));
  });

  it("동등한 baseImageUrl은 동일 키로 정규화한다", () => {
    expect(
      buildAnalysisReuseKey({
        ...baseInput,
        baseImageUrl: " HTTPS://EXAMPLE.COM:443/x.png ",
      }),
    ).toBe(buildAnalysisReuseKey(baseInput));
  });

  it("8자리 소문자 16진수 문자열을 반환한다", () => {
    expect(buildAnalysisReuseKey(baseInput)).toMatch(/^[0-9a-f]{8}$/);
  });
});
