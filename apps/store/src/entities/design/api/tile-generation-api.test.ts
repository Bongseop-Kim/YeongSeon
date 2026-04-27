import { beforeEach, describe, expect, it, vi } from "vitest";
import { callTileGeneration } from "@/entities/design/api/tile-generation-api";
import type { TileGenerationPayload } from "@/entities/design/model/tile-types";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}));

const payload: TileGenerationPayload = {
  route: "tile_generation",
  userMessage: "새 디자인",
  uiFabricType: "printed",
  previousFabricType: null,
  previousRepeatTile: null,
  previousAccentTile: null,
  previousAccentLayoutJson: null,
  conversationHistory: [],
  attachedImageUrl: null,
  sessionId: "session-1",
  workflowId: "workflow-1",
  firstMessage: "새 디자인",
  allMessages: [],
};

describe("callTileGeneration", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("insufficient_tokens 응답 body를 InsufficientTokensError로 보존한다", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({
            error: "insufficient_tokens",
            balance: 3,
            cost: 5,
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        ),
      },
    });

    await expect(callTileGeneration(payload)).rejects.toMatchObject({
      name: "InsufficientTokensError",
      balance: 3,
      cost: 5,
    });
  });

  it("일반 invoke error는 그대로 throw한다", async () => {
    const error = new Error("boom");
    invoke.mockResolvedValueOnce({
      data: null,
      error,
    });

    await expect(callTileGeneration(payload)).rejects.toBe(error);
  });

  it("Edge Function 응답을 안전한 타일 결과 모델로 정규화한다", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        repeatTileUrl: "https://example.com/repeat.webp",
        repeatTileWorkId: "repeat-work",
        accentTileUrl: null,
        accentTileWorkId: null,
        patternType: "all_over",
        fabricType: "printed",
        accentLayout: null,
      },
      error: null,
    });

    await expect(callTileGeneration(payload)).resolves.toEqual({
      repeatTile: {
        url: "https://example.com/repeat.webp",
        workId: "repeat-work",
      },
      accentTile: null,
      patternType: "all_over",
      fabricType: "printed",
      accentLayout: null,
    });
  });

  it("필수 타일 응답 필드가 없으면 명확한 에러를 던진다", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        repeatTileUrl: "https://example.com/repeat.webp",
        repeatTileWorkId: null,
      },
      error: null,
    });

    await expect(callTileGeneration(payload)).rejects.toThrow(
      "Invalid generate-tile response: repeatTile is missing",
    );
  });
});
