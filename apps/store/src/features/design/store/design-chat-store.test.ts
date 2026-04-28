import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

describe("design-chat-store", () => {
  beforeEach(() => {
    useDesignChatStore.getState().resetConversation();
  });

  it("setGeneratedImage는 selectedPreviewImageUrl을 같은 값으로 설정한다", () => {
    const url = 'url("https://example.com/tie.png") center/cover no-repeat';

    act(() => {
      useDesignChatStore.getState().setGeneratedImage(url, ["네이비"]);
    });

    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBe(url);
  });

  it("setGeneratedImage(null)은 프리뷰와 태그를 초기화한다", () => {
    act(() => {
      useDesignChatStore
        .getState()
        .setGeneratedImage(
          'url("https://example.com/tie.png") center/cover no-repeat',
          ["네이비"],
        );
    });

    act(() => {
      useDesignChatStore.getState().setGeneratedImage(null, []);
    });

    expect(useDesignChatStore.getState().generatedImageUrl).toBeNull();
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBeNull();
    expect(useDesignChatStore.getState().resultTags).toEqual([]);
  });

  it("restoreSessionState는 메시지와 타일 상태를 복원한다", () => {
    const url =
      'url("https://example.com/restored.png") center/cover no-repeat';

    act(() => {
      useDesignChatStore.getState().restoreSessionState("session-1", {
        messages: [
          {
            id: "msg-1",
            role: "ai",
            content: "생성 완료",
            imageUrl: "https://example.com/restored.png",
            timestamp: 1,
          },
        ],
        generatedImageUrl: url,
        resultTags: [],
        generationStatus: "completed",
        repeatTile: { url: "https://example.com/repeat.webp", workId: "r1" },
        accentTile: null,
        accentLayout: null,
        patternType: "all_over",
        fabricType: "printed",
      });
    });

    const state = useDesignChatStore.getState();
    expect(state.currentSessionId).toBe("session-1");
    expect(state.selectedPreviewImageUrl).toBe(url);
    expect(state.repeatTile).toEqual({
      url: "https://example.com/repeat.webp",
      workId: "r1",
    });
    expect(state.patternType).toBe("all_over");
    expect(state.fabricType).toBe("printed");
  });

  it("restoreSessionState는 누락된 designContext 필드를 기본값으로 보완한다", () => {
    act(() => {
      useDesignChatStore.getState().restoreSessionState("session-1", {
        messages: [],
        generatedImageUrl: null,
        resultTags: [],
        generationStatus: "idle",
        repeatTile: null,
        accentTile: null,
        accentLayout: null,
        patternType: null,
        fabricType: null,
        designContext: {
          colors: ["#112233"],
          pattern: "stripe",
        },
      });
    });

    expect(useDesignChatStore.getState().designContext).toEqual({
      colors: ["#112233"],
      pattern: "stripe",
      fabricMethod: "yarn-dyed",
      sourceImage: null,
      onePointOffsetX: 0,
      onePointOffsetY: 0,
      ciImage: null,
      ciPlacement: null,
      referenceImage: null,
    });
  });

  it("setTileResult는 타일 상태 전체를 업데이트한다", () => {
    act(() => {
      useDesignChatStore.getState().setTileResult({
        repeatTile: { url: "https://ik.imagekit.io/r.webp", workId: "r1" },
        accentTile: null,
        accentLayout: null,
        patternType: "all_over",
        fabricType: "printed",
      });
    });

    const state = useDesignChatStore.getState();
    expect(state.repeatTile).toEqual({
      url: "https://ik.imagekit.io/r.webp",
      workId: "r1",
    });
    expect(state.patternType).toBe("all_over");
    expect(state.fabricType).toBe("printed");
  });

  it("setSelectedTilePreview는 선택한 메시지의 반복 타일 렌더링 상태를 복원한다", () => {
    act(() => {
      useDesignChatStore.getState().setSelectedTilePreview({
        previewBackground:
          'url("https://example.com/repeat.webp") center/cover no-repeat',
        repeatTile: {
          url: "https://example.com/repeat.webp",
          workId: "repeat-work",
        },
        accentTile: {
          url: "https://example.com/accent.webp",
          workId: "accent-work",
        },
        patternType: "one_point",
      });
    });

    const state = useDesignChatStore.getState();
    expect(state.selectedPreviewImageUrl).toBe(
      'url("https://example.com/repeat.webp") center/cover no-repeat',
    );
    expect(state.selectedTilePreview?.repeatTile).toEqual({
      url: "https://example.com/repeat.webp",
      workId: "repeat-work",
    });
    expect(state.selectedTilePreview?.accentTile).toEqual({
      url: "https://example.com/accent.webp",
      workId: "accent-work",
    });
    expect(state.selectedTilePreview?.patternType).toBe("one_point");
    expect(state.repeatTile).toBeNull();
  });

  it("setSelectedTilePreview는 workId 없는 기존 메시지도 반복 타일 렌더링 상태로 선택한다", () => {
    act(() => {
      useDesignChatStore.getState().setSelectedTilePreview({
        previewBackground:
          'url("https://example.com/repeat.webp") center/cover no-repeat',
        repeatTile: {
          url: "https://example.com/repeat.webp",
          workId: null,
        },
        accentTile: null,
        patternType: "all_over",
      });
    });

    const state = useDesignChatStore.getState();
    expect(state.selectedTilePreview).toEqual({
      previewBackground:
        'url("https://example.com/repeat.webp") center/cover no-repeat',
      repeatTile: {
        url: "https://example.com/repeat.webp",
        workId: null,
      },
      accentTile: null,
      patternType: "all_over",
    });
    expect(state.repeatTile).toBeNull();
  });

  it("제거된 레거시 모델 상태를 노출하지 않는다", () => {
    const state = useDesignChatStore.getState() as unknown as Record<
      string,
      unknown
    >;

    expect(state).not.toHaveProperty("aiModel");
    expect(state).not.toHaveProperty("setGenerationMetadata");
    expect(state).not.toHaveProperty("isLegacySession");
  });
});
