import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InsufficientTokensError } from "@/entities/design/api/ai-design-api";
import { aiDesignApi } from "@/entities/design/api/ai-design-api";

const { invoke, phCapture } = vi.hoisted(() => ({
  invoke: vi.fn(),
  phCapture: vi.fn(),
}));

vi.mock("@/shared/lib/posthog", () => ({
  ph: { capture: phCapture },
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
});
