import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetProbeCacheForTesting,
  shouldUseFalPipeline,
} from "./should-use-fal-pipeline";

const base = {
  ciImageBase64: "abc",
  referenceImageBase64: undefined,
  ciPlacement: "all-over" as const,
  fabricMethod: "yarn-dyed" as const,
  allowFalRender: true,
};

describe("shouldUseFalPipeline", () => {
  beforeEach(() => {
    __resetProbeCacheForTesting();
    vi.useRealTimers();
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

  it("returns true for reference-only all-over requests", async () => {
    await expect(
      shouldUseFalPipeline({
        ...base,
        ciImageBase64: undefined,
        referenceImageBase64: "ref-base64",
      }),
    ).resolves.toBe(true);
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

  it("aborts a slow probe request and caches the fail-open result", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const firstCall = shouldUseFalPipeline(base);
    await vi.advanceTimersByTimeAsync(3_100);

    await expect(firstCall).resolves.toBe(true);
    await expect(shouldUseFalPipeline(base)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
});
