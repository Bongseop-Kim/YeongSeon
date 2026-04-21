import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetProbeCacheForTesting,
  shouldUseFalPipeline,
} from "./should-use-fal-pipeline";

const base = {
  ciImageBase64: "abc",
  ciPlacement: "all-over" as const,
  fabricMethod: "yarn-dyed" as const,
  allowFalRender: true,
};

describe("shouldUseFalPipeline", () => {
  beforeEach(() => {
    __resetProbeCacheForTesting();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true }),
      }),
    );
  });

  it("returns true when all conditions are met and the edge probe is enabled", async () => {
    await expect(shouldUseFalPipeline(base)).resolves.toBe(true);
  });

  it("returns false when rendering is disabled locally", async () => {
    await expect(
      shouldUseFalPipeline({ ...base, allowFalRender: false }),
    ).resolves.toBe(false);
  });

  it("returns false when ciPlacement is one-point", async () => {
    await expect(
      shouldUseFalPipeline({ ...base, ciPlacement: "one-point" }),
    ).resolves.toBe(false);
  });

  it("returns false when ciPlacement is null", async () => {
    await expect(
      shouldUseFalPipeline({ ...base, ciPlacement: null }),
    ).resolves.toBe(false);
  });

  it("returns false when ciImageBase64 is undefined", async () => {
    await expect(
      shouldUseFalPipeline({ ...base, ciImageBase64: undefined }),
    ).resolves.toBe(false);
  });

  it("returns false when ciImageBase64 is empty string", async () => {
    await expect(
      shouldUseFalPipeline({ ...base, ciImageBase64: "" }),
    ).resolves.toBe(false);
  });

  it("returns false when fabricMethod is null", async () => {
    await expect(
      shouldUseFalPipeline({ ...base, fabricMethod: null }),
    ).resolves.toBe(false);
  });

  it("returns false when the edge probe disables the fal pipeline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false }),
      }),
    );

    await expect(shouldUseFalPipeline(base)).resolves.toBe(false);
  });

  it("fails open when the probe request errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(shouldUseFalPipeline(base)).resolves.toBe(true);
  });
});
