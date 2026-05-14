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
  imageCount: 4,
  selectedColors: [],
  previousFabricType: null,
  previousRepeatTile: null,
  previousAccentTile: null,
  previousAccentLayoutJson: null,
  conversationHistory: [],
  attachedImageUrls: [],
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
    const payloadWithAttachments = {
      ...payload,
      attachedImageUrls: [
        "https://ik.imagekit.io/essesion/design-sessions/reference.png",
        "https://ik.imagekit.io/essesion/design-sessions/accent.png",
      ],
    };
    invoke.mockResolvedValueOnce({
      data: {
        generationId: "gen-1",
        prompt: "새 디자인",
        patternType: "all_over",
        fabricType: "printed",
        variants: [1, 2, 3, 4].map((index) => ({
          id: `var-${index}`,
          index,
          repeatTileUrl: `https://example.com/repeat-${index}.webp`,
          repeatTileWorkId: `repeat-work-${index}`,
          accentTileUrl: null,
          accentTileWorkId: null,
          accentLayout: null,
        })),
      },
      error: null,
    });

    await expect(callTileGeneration(payloadWithAttachments)).resolves.toEqual(
      expect.objectContaining({
        generationId: "gen-1",
        prompt: "새 디자인",
        repeatTile: {
          url: "https://example.com/repeat-1.webp",
          workId: "repeat-work-1",
        },
        accentTile: null,
        patternType: "all_over",
        fabricType: "printed",
        accentLayout: null,
        variants: expect.arrayContaining([
          expect.objectContaining({
            id: "var-1",
            index: 1,
            repeatTile: {
              url: "https://example.com/repeat-1.webp",
              workId: "repeat-work-1",
            },
            accentTile: null,
          }),
        ]),
      }),
    );
    expect(invoke).toHaveBeenCalledWith("generate-tile", {
      body: expect.objectContaining({
        attachedImageUrls: payloadWithAttachments.attachedImageUrls,
      }),
    });
  });

  it("variant index 순서로 정렬한 뒤 대표 타일을 선택한다", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        generationId: "gen-1",
        prompt: "새 디자인",
        patternType: "all_over",
        fabricType: "printed",
        variants: [3, 1, 4, 2].map((index) => ({
          id: `var-${index}`,
          index,
          repeatTileUrl: `https://example.com/repeat-${index}.webp`,
          repeatTileWorkId: `repeat-work-${index}`,
          accentTileUrl: null,
          accentTileWorkId: null,
          accentLayout: null,
        })),
      },
      error: null,
    });

    const result = await callTileGeneration(payload);

    expect(result.variants.map((variant) => variant.index)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(result.repeatTile).toEqual({
      url: "https://example.com/repeat-1.webp",
      workId: "repeat-work-1",
    });
  });

  it("원포인트 4-variant 응답을 repeat/accent pair로 정규화한다", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        generationId: "gen-1",
        prompt: "네이비 원포인트",
        patternType: "one_point",
        fabricType: "yarn_dyed",
        variants: [1, 2, 3, 4].map((index) => ({
          id: `var-${index}`,
          index,
          repeatTileUrl: `https://example.com/repeat-${index}.webp`,
          repeatTileWorkId: `repeat-${index}`,
          accentTileUrl: `https://example.com/accent-${index}.webp`,
          accentTileWorkId: `accent-${index}`,
          accentLayout: {
            objectDescription: "crest",
            objectSource: "text",
            color: "gold",
            size: "medium",
          },
        })),
      },
      error: null,
    });

    const result = await callTileGeneration(payload);

    expect(result.generationId).toBe("gen-1");
    expect(result.variants).toHaveLength(4);
    expect(result.variants[0]).toMatchObject({
      id: "var-1",
      index: 1,
      repeatTile: {
        url: "https://example.com/repeat-1.webp",
        workId: "repeat-1",
      },
      accentTile: {
        url: "https://example.com/accent-1.webp",
        workId: "accent-1",
      },
    });
  });

  it("요청 수량만큼 내려온 2-variant 응답을 정규화한다", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        generationId: "gen-1",
        prompt: "두 개 생성",
        patternType: "all_over",
        fabricType: "printed",
        variants: [1, 2].map((index) => ({
          id: `var-${index}`,
          index,
          repeatTileUrl: `https://example.com/repeat-${index}.webp`,
          repeatTileWorkId: `repeat-work-${index}`,
          accentTileUrl: null,
          accentTileWorkId: null,
          accentLayout: null,
        })),
      },
      error: null,
    });

    const result = await callTileGeneration({ ...payload, imageCount: 2 });

    expect(result.variants).toHaveLength(2);
    expect(invoke).toHaveBeenCalledWith("generate-tile", {
      body: expect.objectContaining({ imageCount: 2 }),
    });
  });

  it("필수 타일 응답 필드가 없으면 명확한 에러를 던진다", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        generationId: "gen-1",
        prompt: "새 디자인",
        patternType: "all_over",
        fabricType: "printed",
        variants: [1, 2, 3, 4].map((index) => ({
          id: `var-${index}`,
          index,
          repeatTileUrl: "https://example.com/repeat.webp",
          repeatTileWorkId: index === 1 ? null : `repeat-work-${index}`,
          accentTileUrl: null,
          accentTileWorkId: null,
          accentLayout: null,
        })),
      },
      error: null,
    });

    await expect(callTileGeneration(payload)).rejects.toThrow(
      "Invalid generate-tile response: repeatTile is missing",
    );
  });
});
