import { describe, expect, it, vi } from "vitest";
import { InsufficientTokensError } from "@/entities/design";
import {
  runProviderChain,
  NoProviderAvailableError,
} from "@/entities/design/api/providers/provider-chain";
import {
  ProviderSkipError,
  type GenerationProvider,
} from "@/entities/design/api/providers/provider";

const ok = { aiMessage: "ok", imageUrl: "u", workId: "w" };

function mkProvider(
  name: "fal" | "openai",
  behavior: () => Promise<unknown>,
  canHandle = true,
): GenerationProvider<unknown, typeof ok> {
  return {
    name,
    canHandle: () => canHandle,
    invoke: behavior as never,
  };
}

describe("runProviderChain", () => {
  it("첫 Provider가 성공하면 바로 반환한다", async () => {
    const fal = mkProvider("fal", vi.fn().mockResolvedValue(ok));
    const openai = mkProvider("openai", vi.fn().mockResolvedValue(ok));

    const result = await runProviderChain({ route: "fal_tiling" } as never, [
      fal,
      openai,
    ]);

    expect(result.providerUsed).toBe("fal");
    expect(result.usedFallback).toBe(false);
    expect(openai.invoke).not.toHaveBeenCalled();
  });

  it("ProviderSkipError 시 다음 Provider로 폴백한다", async () => {
    const fal = mkProvider(
      "fal",
      vi.fn().mockRejectedValue(new ProviderSkipError("fal", "x")),
    );
    const openai = mkProvider("openai", vi.fn().mockResolvedValue(ok));

    const result = await runProviderChain({ route: "fal_tiling" } as never, [
      fal,
      openai,
    ]);

    expect(result.providerUsed).toBe("openai");
    expect(result.usedFallback).toBe(true);
  });

  it("InsufficientTokensError는 폴백 없이 즉시 throw", async () => {
    const fal = mkProvider(
      "fal",
      vi.fn().mockRejectedValue(new InsufficientTokensError(0, 5)),
    );
    const openai = mkProvider("openai", vi.fn().mockResolvedValue(ok));

    await expect(
      runProviderChain({ route: "fal_tiling" } as never, [fal, openai]),
    ).rejects.toBeInstanceOf(InsufficientTokensError);
    expect(openai.invoke).not.toHaveBeenCalled();
  });

  it("canHandle이 false인 Provider는 건너뛴다", async () => {
    const fal = mkProvider("fal", vi.fn().mockResolvedValue(ok), false);
    const openai = mkProvider("openai", vi.fn().mockResolvedValue(ok));

    const result = await runProviderChain({ route: "openai" } as never, [
      fal,
      openai,
    ]);

    expect(result.providerUsed).toBe("openai");
    expect(fal.invoke).not.toHaveBeenCalled();
  });

  it("모든 Provider 실패 시 NoProviderAvailableError", async () => {
    const fal = mkProvider(
      "fal",
      vi.fn().mockRejectedValue(new ProviderSkipError("fal", "x")),
      true,
    );

    await expect(
      runProviderChain({ route: "fal_tiling" } as never, [fal]),
    ).rejects.toBeInstanceOf(NoProviderAvailableError);
  });
});
