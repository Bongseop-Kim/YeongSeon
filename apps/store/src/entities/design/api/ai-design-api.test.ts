import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InsufficientTokensError } from "@/entities/design/api/ai-design-api";
import { aiDesignApi } from "@/entities/design/api/ai-design-api";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
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

const baseRequest = {
  userMessage: "네이비 스트라이프 넥타이 만들어줘",
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
};

describe("aiDesignApi", () => {
  beforeEach(() => {
    invoke.mockReset();
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
});
