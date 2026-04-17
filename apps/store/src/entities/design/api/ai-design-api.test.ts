import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InsufficientTokensError } from "@/entities/design/api/ai-design-api";
import { aiDesignApi } from "@/entities/design/api/ai-design-api";
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
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    MockFileReader.configure({});
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
        expect.objectContaining({ has_image: false }),
      );
    });

    it("새로운 분석/렌더 응답 필드를 그대로 반환한다", async () => {
      invoke.mockResolvedValue({
        data: {
          ...successResponse,
          workflowId: "workflow-999",
          analysisWorkId: "analysis-999",
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
    vi.stubEnv("VITE_FALAI_CI_PATTERN_ENABLED", "true");
    tileLogoOnCanvas.mockResolvedValue({
      base64: "tiled-base64",
      mimeType: "image/png",
    });
    invoke.mockResolvedValue({ data: successResponse, error: null });

    vi.stubGlobal("FileReader", MockFileReader);

    await aiDesignApi({
      ...baseRequest,
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
        tiledBase64: "tiled-base64",
        tiledMimeType: "image/png",
      }),
    });
  });

  it("tileLogoOnCanvas 실패는 observability 이벤트를 남기고 정리된 에러를 던진다", async () => {
    vi.stubEnv("VITE_FALAI_CI_PATTERN_ENABLED", "true");
    MockFileReader.configure({ result: "data:image/png;base64,ci-base64" });
    tileLogoOnCanvas.mockRejectedValue(new Error("canvas exploded"));
    vi.stubGlobal("FileReader", MockFileReader);

    await expect(
      aiDesignApi({
        ...baseRequest,
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
});
