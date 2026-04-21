import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin imagekit config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("테스트 환경에서는 endpoint/public key 경고를 출력하지 않는다", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("@/lib/imagekit");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
