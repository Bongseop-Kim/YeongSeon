import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyRouteWithLlm } from "@/entities/design/api/route-classifier";

const { mockInvoke, warnSpy } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  warnSpy: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe("classifyRouteWithLlm", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    warnSpy.mockReset();
    vi.spyOn(console, "warn").mockImplementation(warnSpy);
    vi.unstubAllEnvs();
  });

  it("기본값으로는 LLM 라우트 분류를 호출하지 않는다", async () => {
    const result = await classifyRouteWithLlm({
      userMessage: "체크 패턴 반복해서 넣어줘",
      hasCiImage: true,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: false,
      selectedPreviewImageUrl: null,
      detectedPattern: "check",
    });

    expect(result).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("활성화되어 있고 신뢰도가 임계값 이상이면 분류 결과를 반환한다", async () => {
    vi.stubEnv("VITE_ENABLE_LLM_ROUTE_CLASSIFIER", "true");
    mockInvoke.mockResolvedValueOnce({
      data: {
        route: "fal_controlnet",
        signals: ["pattern_repeat"],
        confidence: 0.82,
      },
      error: null,
    });

    const result = await classifyRouteWithLlm({
      userMessage: "체크 패턴 반복해서 넣어줘",
      hasCiImage: true,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: false,
      selectedPreviewImageUrl: null,
      detectedPattern: "check",
    });

    expect(result).toEqual({
      route: "fal_controlnet",
      signals: ["pattern_repeat"],
      confidence: 0.82,
      source: "llm",
    });
  });

  it("타임아웃 초과 시 null을 반환한다", async () => {
    vi.stubEnv("VITE_ENABLE_LLM_ROUTE_CLASSIFIER", "true");
    mockInvoke.mockImplementationOnce(() => new Promise(() => {}));

    const result = await classifyRouteWithLlm(
      {
        userMessage: "x",
        hasCiImage: false,
        hasReferenceImage: false,
        hasPreviousGeneratedImage: false,
        selectedPreviewImageUrl: null,
        detectedPattern: null,
      },
      { timeoutMs: 50 },
    );

    expect(result).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith(
      "classify-generation-route",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(
      (mockInvoke.mock.calls[0]?.[1] as { signal?: AbortSignal } | undefined)
        ?.signal?.aborted,
    ).toBe(true);
  });

  it("타임아웃으로 중단된 경우 warning을 남기지 않는다", async () => {
    vi.stubEnv("VITE_ENABLE_LLM_ROUTE_CLASSIFIER", "true");
    mockInvoke.mockImplementationOnce(
      (_name: string, options?: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const result = await classifyRouteWithLlm(
      {
        userMessage: "x",
        hasCiImage: false,
        hasReferenceImage: false,
        hasPreviousGeneratedImage: false,
        selectedPreviewImageUrl: null,
        detectedPattern: null,
      },
      { timeoutMs: 50 },
    );

    await Promise.resolve();

    expect(result).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("confidence가 임계값 미만이면 null을 반환한다", async () => {
    vi.stubEnv("VITE_ENABLE_LLM_ROUTE_CLASSIFIER", "true");
    mockInvoke.mockResolvedValueOnce({
      data: { route: "openai", signals: [], confidence: 0.4 },
      error: null,
    });

    const result = await classifyRouteWithLlm({
      userMessage: "그거 해줘",
      hasCiImage: false,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: false,
      selectedPreviewImageUrl: null,
      detectedPattern: null,
    });

    expect(result).toBeNull();
  });

  it("Edge Function 오류 시 null을 반환한다", async () => {
    vi.stubEnv("VITE_ENABLE_LLM_ROUTE_CLASSIFIER", "true");
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error("boom"),
    });

    const result = await classifyRouteWithLlm({
      userMessage: "테스트",
      hasCiImage: false,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: false,
      selectedPreviewImageUrl: null,
      detectedPattern: null,
    });

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "classifyRouteWithLlm error:",
      expect.any(Error),
    );
  });

  it("invoke reject 시에도 null을 반환한다", async () => {
    vi.stubEnv("VITE_ENABLE_LLM_ROUTE_CLASSIFIER", "true");
    mockInvoke.mockRejectedValueOnce(new Error("network"));

    const result = await classifyRouteWithLlm({
      userMessage: "테스트",
      hasCiImage: false,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: false,
      selectedPreviewImageUrl: null,
      detectedPattern: null,
    });

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "classifyRouteWithLlm error:",
      expect.any(Error),
    );
  });
});
