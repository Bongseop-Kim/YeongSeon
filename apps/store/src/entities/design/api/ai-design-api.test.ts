import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InsufficientTokensError } from "@/entities/design/api/ai-design-api";
import { aiDesignApi } from "@/entities/design/api/ai-design-api";
import { __resetProbeCacheForTesting } from "@/entities/design/api/should-use-fal-pipeline";
import { MockFileReader } from "@/test/mock-file-reader";

const { invoke, phCapture, getSession } = vi.hoisted(() => ({
  invoke: vi.fn(),
  phCapture: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/shared/lib/posthog", () => ({
  ph: { capture: phCapture },
}));

vi.mock("@/entities/design/api/route-classifier", () => ({
  classifyRouteWithLlm: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke,
    },
    auth: {
      getSession,
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
    sourceImage: null,
    ciImage: null,
    ciPlacement: null,
    referenceImage: null,
    onePointOffsetX: 0,
    onePointOffsetY: 0,
  },
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
    getSession.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    });
    __resetProbeCacheForTesting();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true }),
      }),
    );
    MockFileReader.reset();
  });

  it("올패턴 sourceImage는 준비 파이프라인을 먼저 거친다", async () => {
    MockFileReader.configure({
      result: "data:image/png;base64,source-base64",
    });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "ready",
          fabricStatus: "ready",
          reasonCodes: [],
          preparedSourceKind: "original",
          preparationBackend: "local",
          repairApplied: false,
          repairPromptKind: null,
          repairSummary: null,
          userMessage: "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
          preparedSourceBase64: "prepared-source-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "prepared-tile-base64",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...successResponse,
          route: "fal_tiling",
        },
        error: null,
      });

    const result = await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부한 이미지를 올패턴으로 뿌려줘",
      designContext: {
        ...baseRequest.designContext,
        sourceImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
      },
    });

    expect(invoke).toHaveBeenNthCalledWith(1, "prepare-pattern-composite", {
      body: expect.objectContaining({
        sourceImageBase64: "source-base64",
        sourceImageMimeType: "image/png",
        placementMode: "all-over",
        fabricMethod: "yarn-dyed",
        scale: "medium",
      }),
    });
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      "generate-fal-api",
      expect.objectContaining({
        body: expect.objectContaining({
          sourceImageBase64: "prepared-source-base64",
          ciImageBase64: "prepared-source-base64",
          tiledBase64: "prepared-tile-base64",
        }),
      }),
    );
    expect(result.patternPreparationMessage).toContain("패턴 소스");
    expect(result.routeReason).toBe("pattern_source_ready");
  });

  it("부적합한 올패턴 이미지는 OpenAI prep을 먼저 호출한 뒤 보정 타일로 렌더한다", async () => {
    MockFileReader.configure({
      result: "data:image/png;base64,source-base64",
    });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "repair_required",
          fabricStatus: "ready",
          reasonCodes: ["uneven_outer_margin"],
          preparedSourceKind: "repaired",
          preparationBackend: "openai_repair",
          repairApplied: true,
          userMessage: "첨부 이미지를 반복 패턴에 맞게 다시 정리했어요.",
          repairSummary: "타일 반복 간격을 균일하게 보정했습니다.",
          repairPromptKind: "all_over_tile",
          prepTokensCharged: 7,
          preparedSourceBase64: "openai-prepared-source",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "openai-prepared-tile",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...successResponse,
          route: "fal_tiling",
        },
        error: null,
      });

    const result = await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부한 이미지를 올패턴으로 뿌려줘",
      designContext: {
        ...baseRequest.designContext,
        sourceImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
      },
    });

    expect(invoke).toHaveBeenNthCalledWith(1, "prepare-pattern-composite", {
      body: expect.objectContaining({
        sourceImageBase64: "source-base64",
        sourceImageMimeType: "image/png",
        placementMode: "all-over",
        fabricMethod: "yarn-dyed",
        scale: "medium",
      }),
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "generate-fal-api", {
      body: expect.objectContaining({
        sourceImageBase64: "openai-prepared-source",
        ciImageBase64: "openai-prepared-source",
        tiledBase64: "openai-prepared-tile",
        tiledMimeType: "image/png",
        patternPreparation: expect.objectContaining({
          preparedSourceKind: "repaired",
        }),
      }),
    });
    expect(result.patternPreparationMessage).toContain("다시 정리");
    expect(result.routeReason).toBe("pattern_source_repaired");
  });

  it("부적합한 원포인트 이미지는 OpenAI prep 모티프를 anchor 배치용 source로 사용한다", async () => {
    MockFileReader.configure({
      result: "data:image/png;base64,source-base64",
    });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "one-point",
          sourceStatus: "repair_required",
          fabricStatus: "repair_required",
          reasonCodes: [
            "not_suitable_for_one_point",
            "too_many_colors_for_yarn_dyed",
          ],
          preparedSourceKind: "repaired",
          preparationBackend: "openai_repair",
          repairApplied: true,
          preparedSourceBase64: "prepared-point-source",
          preparedSourceMimeType: "image/png",
          preparedPointMotifTileBase64: "prepared-point-tile",
          preparedPointMotifTileMimeType: "image/png",
          repairSummary: "원포인트용 단일 모티프로 정리했습니다.",
          repairPromptKind: "one_point_motif",
          prepTokensCharged: 7,
          tileSizePx: 123,
          gapPx: 0,
          compositeCanvasWidth: 316,
          compositeCanvasHeight: 600,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부 이미지를 원포인트로 써줘",
      designContext: {
        ...baseRequest.designContext,
        sourceImage: { type: "image/png" } as File,
        ciPlacement: "one-point",
      },
    });

    expect(invoke).toHaveBeenNthCalledWith(1, "prepare-pattern-composite", {
      body: expect.objectContaining({
        placementMode: "one-point",
        scale: "medium",
      }),
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "generate-open-api", {
      body: expect.objectContaining({
        sourceImageBase64: "prepared-point-tile",
        ciImageBase64: "prepared-point-tile",
        patternPreparation: expect.objectContaining({
          placementMode: "one-point",
          preparedSourceKind: "repaired",
          prepTokensCharged: 7,
        }),
      }),
    });
  });

  it("OpenAI prep이 실패하면 원본 이미지로 openai 생성에 폴백한다", async () => {
    MockFileReader.configure({
      result: "data:image/png;base64,source-base64",
    });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: null,
        error: { message: "prep failed" },
      })
      .mockResolvedValueOnce({
        data: successResponse,
        error: null,
      });

    await expect(
      aiDesignApi({
        ...baseRequest,
        userMessage: "첨부한 이미지를 올패턴으로 뿌려줘",
        designContext: {
          ...baseRequest.designContext,
          sourceImage: { type: "image/png" } as File,
          ciPlacement: "all-over",
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        imageUrl: successResponse.imageUrl,
        route: "openai",
      }),
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenNthCalledWith(2, "generate-open-api", {
      body: expect.objectContaining({
        sourceImageBase64: "source-base64",
        ciImageBase64: "source-base64",
      }),
    });
    expect(phCapture).toHaveBeenCalledWith(
      "design_generation_failed",
      expect.objectContaining({
        ai_model: "openai",
        error_type: "pattern_preparation_failed",
      }),
    );
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

  it("Fal 플래그와 올패턴 CI 조건이 맞으면 Edge prep 이후 generate-fal-api를 호출한다", async () => {
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "ready",
          fabricStatus: "ready",
          reasonCodes: [],
          preparedSourceKind: "original",
          preparationBackend: "local",
          repairApplied: false,
          repairPromptKind: null,
          repairSummary: null,
          userMessage: "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
          preparedSourceBase64: "ci-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "tiled-base64",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: successResponse, error: null });

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

    expect(invoke).toHaveBeenNthCalledWith(1, "prepare-pattern-composite", {
      body: expect.objectContaining({
        sourceImageBase64: "ci-base64",
        placementMode: "all-over",
      }),
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "generate-fal-api", {
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

  it("fabricMethod가 없으면 fal_tiling 요청도 openai로 처리한다", async () => {
    MockFileReader.configure({ result: "data:image/png;base64,ci-base64" });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "ready",
          fabricStatus: "ready",
          reasonCodes: [],
          preparedSourceKind: "original",
          preparationBackend: "local",
          repairApplied: false,
          repairPromptKind: null,
          repairSummary: null,
          userMessage: "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
          preparedSourceBase64: "ci-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "tiled-base64",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
      designContext: {
        ...baseRequest.designContext,
        ciImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
        fabricMethod: null,
        scale: "medium",
      },
    });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenNthCalledWith(2, "generate-open-api", {
      body: expect.objectContaining({
        userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
        ciImageBase64: "ci-base64",
      }),
    });
    expect(invoke.mock.calls[1]?.[1]).toEqual(
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

  it("repair_required 상태는 preparedSourceKind가 original이어도 ready route로 내려가지 않는다", async () => {
    MockFileReader.configure({
      result: "data:image/png;base64,source-base64",
    });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "repair_required",
          fabricStatus: "ready",
          reasonCodes: ["uneven_outer_margin"],
          preparedSourceKind: "original",
          preparationBackend: "local",
          repairApplied: false,
          repairPromptKind: null,
          repairSummary: null,
          userMessage: "첨부 이미지를 패턴 소스로 정리했어요.",
          preparedSourceBase64: "prepared-source-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "prepared-tile-base64",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...successResponse,
          route: "fal_tiling",
        },
        error: null,
      });

    const result = await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부한 이미지를 올패턴으로 뿌려줘",
      designContext: {
        ...baseRequest.designContext,
        sourceImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
      },
    });

    expect(result.routeReason).toBe("pattern_source_repaired");
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
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "ready",
          fabricStatus: "ready",
          reasonCodes: [],
          preparedSourceKind: "original",
          userMessage: "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
          preparedSourceBase64: "reference-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "prepared-reference-tile",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: successResponse, error: null });

    await aiDesignApi({
      ...baseRequest,
      route: "fal_tiling",
      userMessage: "이 레퍼런스 이미지처럼 올 패턴으로 만들어줘",
      designContext: {
        ...baseRequest.designContext,
        ciPlacement: "all-over",
        sourceImage: { type: "image/png" } as File,
      },
    });

    expect(invoke).toHaveBeenNthCalledWith(2, "generate-fal-api", {
      body: expect.objectContaining({
        route: "fal_tiling",
        sourceImageBase64: "reference-base64",
        ciImageBase64: "reference-base64",
        tiledBase64: "prepared-reference-tile",
      }),
    });
  });

  it("sharp-edge controlnet 경로에서는 CI 원본을 control image로 전달한다", async () => {
    MockFileReader.configure({ result: "data:image/png;base64,ci-base64" });
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "ready",
          fabricStatus: "ready",
          reasonCodes: [],
          preparedSourceKind: "original",
          preparationBackend: "local",
          repairApplied: false,
          repairPromptKind: null,
          repairSummary: null,
          userMessage: "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
          preparedSourceBase64: "ci-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "prepared-controlnet-tile",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...successResponse, route: "fal_controlnet" },
        error: null,
      });

    await aiDesignApi({
      ...baseRequest,
      userMessage: "첨부한 이미지를 반복 패턴으로 만들어줘",
      designContext: {
        ...baseRequest.designContext,
        pattern: "check",
        ciImage: { type: "image/png" } as File,
        ciPlacement: "all-over",
        scale: "medium",
      },
    });

    expect(invoke).toHaveBeenNthCalledWith(2, "generate-fal-api", {
      body: expect.objectContaining({
        route: "fal_controlnet",
        structureImageBase64: "prepared-controlnet-tile",
        structureImageMimeType: "image/png",
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

  it("일반 API 에러를 감쌀 때 원래 에러를 cause로 보존한다", async () => {
    const originalError = Object.assign(new Error("Internal Server Error"), {
      name: "FunctionsHttpError",
    });
    invoke.mockResolvedValue({
      data: null,
      error: originalError,
    });

    const rejection = aiDesignApi(baseRequest).catch((error) => error);

    await expect(rejection).resolves.toMatchObject({
      message: "디자인 생성 실패: Internal Server Error",
      cause: originalError,
    });
  });

  it("Fal API가 비활성화되어 있으면 기존 모델 함수로 한 번 폴백한다", async () => {
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "ready",
          fabricStatus: "ready",
          reasonCodes: [],
          preparedSourceKind: "original",
          preparationBackend: "local",
          repairApplied: false,
          repairPromptKind: null,
          repairSummary: null,
          userMessage: "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
          preparedSourceBase64: "ci-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "tiled-base64",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
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
        routeReason: "pattern_source_ready",
        falRequestId: "fal-request-123",
        seed: 1234,
      }),
    );

    expect(invoke).toHaveBeenNthCalledWith(2, "generate-fal-api", {
      body: expect.objectContaining({
        tiledBase64: "tiled-base64",
        tiledMimeType: "image/png",
      }),
    });
    expect(invoke).toHaveBeenNthCalledWith(3, "generate-open-api", {
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false }),
      }),
    );
    vi.stubGlobal("FileReader", MockFileReader);
    invoke
      .mockResolvedValueOnce({
        data: {
          placementMode: "all-over",
          sourceStatus: "ready",
          fabricStatus: "ready",
          reasonCodes: [],
          preparedSourceKind: "original",
          preparationBackend: "local",
          repairApplied: false,
          repairPromptKind: null,
          repairSummary: null,
          userMessage: "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
          preparedSourceBase64: "ci-base64",
          preparedSourceMimeType: "image/png",
          preparedPatternTileBase64: "tiled-base64",
          preparedPatternTileMimeType: "image/png",
          tileSizePx: 123,
          gapPx: 31,
          compositeCanvasWidth: 1024,
          compositeCanvasHeight: 1024,
          harmonizationApplied: false,
          harmonizationBackend: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: successResponse, error: null });

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

    expect(invoke).toHaveBeenCalledTimes(2);
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
