import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetProbeCacheForTesting,
  shouldUseFalPipeline,
} from "./should-use-fal-pipeline";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

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
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    });
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

  it("sends auth headers with the probe request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await shouldUseFalPipeline(base);

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/functions/v1/generate-fal-api/should-use-fal-pipeline",
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon-key",
          Authorization: "Bearer access-token",
        }),
      }),
    );
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

  it("fails closed when the probe response omits enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );

    await expect(shouldUseFalPipeline(base)).resolves.toBe(false);
  });

  it("fails closed when the probe request errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(shouldUseFalPipeline(base)).resolves.toBe(false);
  });

  it("aborts a slow probe request and caches the fail-closed result", async () => {
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

    await expect(firstCall).resolves.toBe(false);
    await expect(shouldUseFalPipeline(base)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("getSession이 지연되면 probe timeout 안에 fail-closed 한다", async () => {
    vi.useFakeTimers();
    getSessionMock.mockImplementation(
      () =>
        new Promise(() => {
          // never resolves
        }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const call = shouldUseFalPipeline(base);
    await vi.advanceTimersByTimeAsync(3_100);

    await expect(call).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
