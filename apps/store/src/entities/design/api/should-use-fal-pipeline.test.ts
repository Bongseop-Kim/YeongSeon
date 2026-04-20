import { describe, expect, it } from "vitest";
import { shouldUseFalPipeline } from "./should-use-fal-pipeline";

const base = {
  ciImageBase64: "abc",
  ciPlacement: "all-over" as const,
  fabricMethod: "yarn-dyed" as const,
  autoGenerate: true,
};

describe("shouldUseFalPipeline", () => {
  it("returns true when all conditions are met", () => {
    expect(shouldUseFalPipeline(base)).toBe(true);
  });

  it("returns false when autoGenerate is false", () => {
    expect(shouldUseFalPipeline({ ...base, autoGenerate: false })).toBe(false);
  });

  it("returns false when ciPlacement is one-point", () => {
    expect(shouldUseFalPipeline({ ...base, ciPlacement: "one-point" })).toBe(
      false,
    );
  });

  it("returns false when ciPlacement is null", () => {
    expect(shouldUseFalPipeline({ ...base, ciPlacement: null })).toBe(false);
  });

  it("returns false when ciImageBase64 is undefined", () => {
    expect(shouldUseFalPipeline({ ...base, ciImageBase64: undefined })).toBe(
      false,
    );
  });

  it("returns false when ciImageBase64 is empty string", () => {
    expect(shouldUseFalPipeline({ ...base, ciImageBase64: "" })).toBe(false);
  });

  it("returns false when fabricMethod is null", () => {
    expect(shouldUseFalPipeline({ ...base, fabricMethod: null })).toBe(false);
  });
});
