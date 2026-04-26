import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RestoredDesignSessionState } from "@/entities/design";
import { useSessionRestore } from "@/features/design/hooks/use-session-restore";

const { restoreSessionState, mockQueryData } = vi.hoisted(() => ({
  restoreSessionState: vi.fn(),
  mockQueryData: {
    data: undefined as RestoredDesignSessionState | undefined,
  },
}));

vi.mock("@/features/design/hooks/design-session-query", () => ({
  useDesignSessionMessagesQuery: () => mockQueryData,
}));

vi.mock("@/features/design/store/design-chat-store", () => ({
  useDesignChatStore: (
    selector: (state: {
      restoreSessionState: typeof restoreSessionState;
    }) => unknown,
  ) =>
    selector({
      restoreSessionState,
    }),
}));

describe("useSessionRestore", () => {
  beforeEach(() => {
    restoreSessionState.mockReset();
    mockQueryData.data = undefined;
  });

  it("세션 복원 시 메시지와 프리뷰 상태를 함께 스토어에 반영한다", async () => {
    mockQueryData.data = {
      messages: [
        {
          id: "msg-1",
          role: "ai",
          content: "생성 완료",
          imageUrl: "https://example.com/tie.png",
          timestamp: new Date("2026-03-19T10:00:00Z").getTime(),
        },
      ],
      generatedImageUrl:
        'url("https://example.com/tie.png") center/cover no-repeat',
      baseImageWorkId: null,
      resultTags: [],
      generationStatus: "completed",
      repeatTile: null,
      accentTile: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
    };

    const onRestored = vi.fn();
    const { result } = renderHook(() => useSessionRestore({ onRestored }));

    act(() => {
      result.current.restoreSession({
        id: "session-1",
        aiModel: "openai",
        firstMessage: "생성",
        lastImageUrl: "https://example.com/tie.png",
        lastImageFileId: "file-1",
        lastImageWorkId: "work-restore-1",
        repeatTileUrl: null,
        repeatTileWorkId: null,
        accentTileUrl: null,
        accentTileWorkId: null,
        accentLayout: null,
        patternType: null,
        fabricType: null,
        imageCount: 1,
        createdAt: "2026-03-19T10:00:00Z",
        updatedAt: "2026-03-19T10:00:00Z",
      });
    });

    await waitFor(() => {
      expect(restoreSessionState).toHaveBeenCalledWith("session-1", {
        messages: [
          expect.objectContaining({
            id: "msg-1",
            imageUrl: "https://example.com/tie.png",
          }),
        ],
        generatedImageUrl:
          'url("https://example.com/tie.png") center/cover no-repeat',
        baseImageWorkId: "work-restore-1",
        resultTags: [],
        generationStatus: "completed",
        repeatTile: null,
        accentTile: null,
        accentLayout: null,
        patternType: null,
        fabricType: null,
      });
    });
    expect(onRestored).toHaveBeenCalledOnce();
  });

  it("이미지가 없는 세션은 프리뷰를 비운 상태로 복원한다", async () => {
    mockQueryData.data = {
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "텍스트만",
          timestamp: new Date("2026-03-19T10:00:00Z").getTime(),
        },
      ],
      generatedImageUrl: null,
      baseImageWorkId: null,
      resultTags: [],
      generationStatus: "idle",
      repeatTile: null,
      accentTile: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
    };

    const { result } = renderHook(() => useSessionRestore());

    act(() => {
      result.current.restoreSession({
        id: "session-2",
        aiModel: "openai",
        firstMessage: "텍스트만",
        lastImageUrl: null,
        lastImageFileId: null,
        lastImageWorkId: null,
        repeatTileUrl: null,
        repeatTileWorkId: null,
        accentTileUrl: null,
        accentTileWorkId: null,
        accentLayout: null,
        patternType: null,
        fabricType: null,
        imageCount: 0,
        createdAt: "2026-03-19T10:00:00Z",
        updatedAt: "2026-03-19T10:00:00Z",
      });
    });

    await waitFor(() => {
      expect(restoreSessionState).toHaveBeenCalledWith(
        "session-2",
        expect.objectContaining({
          generatedImageUrl: null,
          baseImageWorkId: null,
          generationStatus: "idle",
        }),
      );
    });
  });

  it("one-point 타일 세션 복원 시 accentLayout을 유지한다", async () => {
    mockQueryData.data = {
      messages: [],
      designContext: {
        pattern: "stripe",
      },
      generatedImageUrl: null,
      baseImageWorkId: null,
      resultTags: [],
      generationStatus: "idle",
      repeatTile: null,
      accentTile: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
    };

    const { result } = renderHook(() => useSessionRestore());

    act(() => {
      result.current.restoreSession({
        id: "session-tile",
        aiModel: "openai",
        firstMessage: "로고 포인트",
        lastImageUrl: "https://example.com/repeat.png",
        lastImageFileId: null,
        lastImageWorkId: "repeat-work",
        repeatTileUrl: "https://example.com/repeat.png",
        repeatTileWorkId: "repeat-work",
        accentTileUrl: "https://example.com/accent.png",
        accentTileWorkId: "accent-work",
        accentLayout: {
          objectDescription: "브랜드 로고",
          objectSource: "text",
          color: "navy",
          size: "medium",
        },
        patternType: "one_point",
        fabricType: "printed",
        imageCount: 1,
        createdAt: "2026-03-19T10:00:00Z",
        updatedAt: "2026-03-19T10:00:00Z",
      });
    });

    await waitFor(() => {
      expect(restoreSessionState).toHaveBeenCalledWith(
        "session-tile",
        expect.objectContaining({
          repeatTile: {
            url: "https://example.com/repeat.png",
            workId: "repeat-work",
          },
          accentTile: {
            url: "https://example.com/accent.png",
            workId: "accent-work",
          },
          accentLayout: {
            objectDescription: "브랜드 로고",
            objectSource: "text",
            color: "navy",
            size: "medium",
          },
          patternType: "one_point",
          fabricType: "printed",
          designContext: {
            pattern: "stripe",
            fabricMethod: "print",
          },
        }),
      );
    });
  });
});
