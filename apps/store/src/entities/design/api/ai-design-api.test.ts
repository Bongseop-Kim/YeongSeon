import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InsufficientTokensError } from "@/entities/design/api/ai-design-api";
import { aiDesignApi } from "@/entities/design/api/ai-design-api";
import { __resetProbeCacheForTesting } from "@/entities/design/api/should-use-fal-pipeline";
import { MockFileReader } from "@/test/mock-file-reader";

const { invoke, phCapture, tileLogoOnCanvas } = vi.hoisted(() => ({
  invoke: vi.fn(),
  phCapture: vi.fn(),
  tileLogoOnCanvas: vi.fn(),
}));

vi.mock("@/shared/lib/posthog", () => ({
  ph: { capture: phCapture },
}));

vi.mock("@/entities/design/api/tile-logo-on-canvas", () => ({
  tileLogoOnCanvas,
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke,
    },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

const userMessage = "네이비 스트라이프 넥타이 만들어줘";

const baseRequest = {
  userMessage,
  attachments: [],
  designContext: {
    colors: [],
    pattern: null,
    fabricMethod: "yarn-dyed" as const,
    ciImage: null,
    ciPlacement: null,
    referenceImage: null,
  },
  aiModel: "openai" as const,
  conversationHistory: [],
  sessionId: "test-session-id",
  firstMessage: userMessage,
  allMessages: [],
};

const successResponse = {
  aiMessage: "네이비 스트라이프 넥타이 디자인을 만들었습니다.",
  imageUrl: "https://example.com/image.png",
  workId: "work-123",
  workflowId: "workflow-123",
  analysisWorkId: "analysis-123",
  route: "openai" as const,
  routeSignals: ["new_generation"],
  routeReason: "default_openai_generation" as const,
  falRequestId: "fal-request-123",
  seed: 1234,
  generateImage: true,
  eligibleForRender: true,
  missingRequirements: [],
  tags: ["navy", "stripe"],
  contextChips: [],
  remainingTokens: 95,
};

describe("aiDesignApi", () => {
  beforeEach(() => {
    invoke.mockReset();
    phCapture.mockReset();
    tileLogoOnCanvas.mockReset();
    __resetProbeCacheForTesting();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true }),
      }),
    );
    MockFileReader.reset();
  });

  it("토큰 부족 응답은 InsufficientTokensError로 변환한다", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new Response(
          JSON.stringify({
            error: "insufficient_tokens",
            balance: 3,
            cost: 5,
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      },
    });

    await expect(aiDesignApi(baseRequest)).rejects.toEqual(
      expect.objectContaining<Partial<InsufficientTokensError>>({
        name: "InsufficientTokensError",
        balance: 3,
        cost: 5,
      }),
    );
  });

  it("응답 JSON 파싱 실패는 일반 생성 실패로 숨기지 않고 그대로 드러낸다", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new Response("{invalid-json", {
          headers: {
            "Content-Type": "application/json",
          },
        }),
      },
    });

    await expect(aiDesignApi(baseRequest)).rejects.toBeInstanceOf(SyntaxError);
  });

  describe("PostHog 이벤트", () => {
    it("성공 시 design_generated 이벤트를 캡처한다", async () => {
      invoke.mockResolvedValue({ data: successResponse, error: null });

      await aiDesignApi(baseRequest);

      expect(phCapture).toHaveBeenCalledWith(
        "design_generated",
        expect.objectContaining({
          ai_model: "openai",
          has_image: true,
          route: "openai",
          route_reason: "default_openai_generation",
          route_signals: ["new_generation"],
        }),
      );
      const designGeneratedCall = phCapture.mock.calls.find(
        (call) => call[0] === "design_generated",
      );
      expect(
        (designGeneratedCall?.[1] as { latency_ms: number }).latency_ms,
      ).toBeGreaterThanOrEqual(0);
    });

    it("이미지 없는 성공 응답은 has_image: false로 캡처한다", async () => {
      invoke.mockResolvedValue({
        data: { ...successResponse, imageUrl: null },
        error: null,
      });

      await aiDesignApi(baseRequest);

      expect(phCapture).toHaveBeenCalledWith(
        "design_generated",
        expect.objectContaining({
          has_image: false,
          route: "openai",
          route_reason: "default_openai_generation",
          route_signals: ["new_generation"],
        }),
      );
    });

    it("새로운 분석/렌더 응답 필드를 그대로 반환한다", async () => {
      invoke.mockResolvedValue({
        data: {
          ...successResponse,
          workflowId: "workflow-999",
          analysisWorkId: "analysis-999",
          route: "fal_edit",
          routeSignals: ["exact_placement", "edit_only"],
          routeReason: "existing_result_edit_request",
          falRequestId: "fal-request-999",
          seed: 4321,
          generateImage: false,
          eligibleForRender: false,
          missingRequirements: ["fabricMethod"],
        },
        error: null,
      });

      await expect(aiDesignApi(baseRequest)).resolves.toEqual(
        expect.objectContaining({
          workflowId: "workflow-999",
          analysisWorkId: "analysis-999",
          route: "fal_edit",
          routeSignals: ["exact_placement", "edit_only"],
          routeReason: "existing_result_edit_request",
          falRequestId: "fal-request-999",
          seed: 4321,
          generateImage: false,
          eligibleForRender: false,
          missingRequirements: ["fabricMethod"],
        }),
      );
    });

    it("토큰 부족 에러는 design_generation_failed를 insufficient_tokens로 캡처한다", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: {
          message: "Edge Function returned a non-2xx status code",
          context: new Response(
            JSON.stringify({
              error: "insufficient_tokens",
              balance: 3,
              cost: 5,
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
        },
      });

      await expect(aiDesignApi(baseRequest)).rejects.toThrow();
      expect(phCapture).toHaveBeenCalledWith("design_generation_failed", {
        ai_model: "openai",
        error_type: "insufficient_tokens",
      });
    });

    it("일반 API 에러는 design_generation_failed를 api_error로 캡처한다", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: { message: "Internal Server Error" },
      });

      await expect(aiDesignApi(baseRequest)).rejects.toThrow();
      expect(phCapture).toHaveBeenCalledWith("design_generation_failed", {
        ai_model: "openai",
        error_type: "api_error",
      });
    });
  });

  it("Fal 플래그와 올패턴 CI 조건이 맞으면 generate-fal-api를 호출한다", async () => {
    tileLogoOnCanvas.mockResolvedValue({
      base64: "tiled-base64",
      mimeType: "image/png",
    });
    invoke.mockResolvedValue({ data: successResponse, error: null });

    vi.stubGlobal("FileReader", MockFileReader);

    await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
      designContext: {
        ...baseRequest.designContext,
        ciImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
        scale: "medium",
      },
    });

    expect(tileLogoOnCanvas).toHaveBeenCalledWith({
      logoBase64: "ci-base64",
      logoMimeType: "image/png",
      scale: "medium",
      backgroundColor: undefined,
    });
    expect(invoke).toHaveBeenCalledWith("generate-fal-api", {
      body: expect.objectContaining({
        route: "fal_tiling",
        routeSignals: expect.arrayContaining([
          "ci_image_present",
          "pattern_repeat",
        ]),
        routeReason: "ci_image_with_pattern_repeat",
        tiledBase64: "tiled-base64",
        tiledMimeType: "image/png",
      }),
    });
  });

  it.each([
    {
      title: "auto가 아니면 fal_tiling 요청도 로컬에서 openai로 처리한다",
      executionMode: "analysis_only" as const,
      fabricMethod: "yarn-dyed" as const,
    },
    {
      title:
        "fabricMethod가 없으면 fal_tiling 요청도 로컬에서 openai로 처리한다",
      executionMode: undefined,
      fabricMethod: null,
    },
  ])("$title", async ({ executionMode, fabricMethod }) => {
    MockFileReader.configure({ result: "data:image/png;base64,ci-base64" });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke.mockResolvedValue({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      executionMode,
      userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
      designContext: {
        ...baseRequest.designContext,
        ciImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
        fabricMethod,
        scale: "medium",
      },
    });

    expect(tileLogoOnCanvas).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("generate-open-api", {
      body: expect.objectContaining({
        userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
        ciImageBase64: "ci-base64",
      }),
    });
    expect(invoke.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: expect.not.objectContaining({
          route: expect.anything(),
          routeSignals: expect.anything(),
          routeReason: expect.anything(),
          tiledBase64: expect.anything(),
          tiledMimeType: expect.anything(),
        }),
      }),
    );
  });

  it("편집 라우트는 baseImageUrl과 baseImageWorkId를 payload에 담아 generate-fal-api를 호출한다", async () => {
    invoke.mockResolvedValue({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      userMessage: "포인트 위치가 너무 높아 아래로 내려줘",
      baseImageUrl: "https://example.com/base.png",
      baseImageWorkId: "work-base-1",
    });

    expect(invoke).toHaveBeenCalledWith("generate-fal-api", {
      body: expect.objectContaining({
        route: "fal_edit",
        routeSignals: expect.arrayContaining([
          "selected_preview_image_present",
          "exact_placement",
          "edit_only",
        ]),
        routeReason: "existing_result_edit_request",
        baseImageUrl: "https://example.com/base.png",
        baseImageWorkId: "work-base-1",
      }),
    });
  });

  it("reference-only all-over 요청도 fal_tiling 경로로 전달한다", async () => {
    MockFileReader.configure({
      result: "data:image/png;base64,reference-base64",
    });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke.mockResolvedValue({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      route: "fal_tiling",
      userMessage: "이 레퍼런스 이미지처럼 올 패턴으로 만들어줘",
      designContext: {
        ...baseRequest.designContext,
        ciPlacement: "all-over",
        referenceImage: { type: "image/png" } as File,
      },
    });

    expect(tileLogoOnCanvas).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("generate-fal-api", {
      body: expect.objectContaining({
        route: "fal_tiling",
        referenceImageBase64: "reference-base64",
      }),
    });
  });

  it("one-point CI 배치에서는 solid backgroundPattern을 payload에 주입한다", async () => {
    invoke.mockResolvedValue({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      userMessage: "원포인트 로고 넥타이로 만들어줘",
      designContext: {
        ...baseRequest.designContext,
        colors: ["#123456"],
        ciPlacement: "one-point",
      },
    });

    expect(invoke).toHaveBeenCalledWith("generate-open-api", {
      body: expect.objectContaining({
        designContext: expect.objectContaining({
          backgroundPattern: {
            type: "solid",
            color: "#123456",
          },
        }),
      }),
    });
  });

  it("tileLogoOnCanvas 실패는 observability 이벤트를 남기고 정리된 에러를 던진다", async () => {
    MockFileReader.configure({ result: "data:image/png;base64,ci-base64" });
    tileLogoOnCanvas.mockRejectedValue(new Error("canvas exploded"));
    vi.stubGlobal("FileReader", MockFileReader);

    await expect(
      aiDesignApi({
        ...baseRequest,
        userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
        designContext: {
          ...baseRequest.designContext,
          ciImage: { type: "image/png" } as File,
          ciPlacement: "all-over",
          scale: "medium",
        },
      }),
    ).rejects.toThrow("CI 패턴 이미지를 준비하지 못했습니다.");

    expect(phCapture).toHaveBeenCalledWith(
      "design_generation_failed",
      expect.objectContaining({
        ai_model: "openai",
        error_type: "tile_logo_on_canvas_failed",
        pipeline: "fal-ai",
        fabric_method: "yarn-dyed",
        scale: "medium",
      }),
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("Fal API가 비활성화되어 있으면 기존 모델 함수로 한 번 폴백한다", async () => {
    tileLogoOnCanvas.mockResolvedValue({
      base64: "tiled-base64",
      mimeType: "image/png",
    });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Edge Function returned a non-2xx status code",
          context: new Response(
            JSON.stringify({
              error: "fal_pipeline_disabled",
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
              },
            },
          ),
        },
      })
      .mockResolvedValueOnce({ data: successResponse, error: null });

    await expect(
      aiDesignApi({
        ...baseRequest,
        userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
        designContext: {
          ...baseRequest.designContext,
          ciImage: { type: "image/png" } as File,
          ciPlacement: "all-over",
          scale: "medium",
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        aiMessage: successResponse.aiMessage,
        imageUrl: successResponse.imageUrl,
        workId: successResponse.workId,
        workflowId: successResponse.workflowId,
        analysisWorkId: successResponse.analysisWorkId,
        route: "openai",
        routeSignals: ["new_generation"],
        routeReason: "default_openai_generation",
        falRequestId: "fal-request-123",
        seed: 1234,
      }),
    );

    expect(invoke).toHaveBeenNthCalledWith(1, "generate-fal-api", {
      body: expect.objectContaining({
        tiledBase64: "tiled-base64",
        tiledMimeType: "image/png",
      }),
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "generate-open-api", {
      body: expect.not.objectContaining({
        tiledBase64: "tiled-base64",
        tiledMimeType: "image/png",
        route: "fal_tiling",
        routeSignals: expect.anything(),
        routeReason: "ci_image_with_pattern_repeat",
      }),
    });
  });

  it("Fal probe가 비활성화 상태를 반환하면 Edge 호출 없이 즉시 폴백한다", async () => {
    tileLogoOnCanvas.mockResolvedValue({
      base64: "tiled-base64",
      mimeType: "image/png",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false }),
      }),
    );
    vi.stubGlobal("FileReader", MockFileReader);
    invoke.mockResolvedValue({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
      designContext: {
        ...baseRequest.designContext,
        ciImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
        scale: "medium",
      },
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(tileLogoOnCanvas).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("generate-open-api", {
      body: expect.not.objectContaining({
        route: "fal_tiling",
        tiledBase64: "tiled-base64",
      }),
    });
  });

  it("fal_edit가 fal_pipeline_disabled로 폴백되면 두 번째 invoke가 edit context를 유지한다", async () => {
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Edge Function returned a non-2xx status code",
          context: new Response(
            JSON.stringify({
              error: "fal_pipeline_disabled",
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
              },
            },
          ),
        },
      })
      .mockResolvedValueOnce({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      userMessage: "포인트 위치가 너무 높아 아래로 내려줘",
      routeHint: "fal_edit",
      baseImageUrl: "https://example.com/base.png",
      baseImageWorkId: "work-base-1",
      designContext: {
        ...baseRequest.designContext,
        colors: ["#123456"],
        ciPlacement: "one-point",
      },
    });

    expect(invoke).toHaveBeenNthCalledWith(1, "generate-fal-api", {
      body: expect.objectContaining({
        route: "fal_edit",
        routeSignals: expect.arrayContaining([
          "selected_preview_image_present",
          "exact_placement",
          "edit_only",
        ]),
        routeReason: "existing_result_edit_request",
      }),
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "generate-open-api", {
      body: expect.objectContaining({
        baseImageUrl: "https://example.com/base.png",
        baseImageWorkId: "work-base-1",
        routeHint: "fal_edit",
        designContext: expect.objectContaining({
          backgroundPattern: {
            type: "solid",
            color: "#123456",
          },
        }),
      }),
    });
  });
});
