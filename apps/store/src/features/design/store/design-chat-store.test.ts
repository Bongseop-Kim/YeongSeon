import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

describe("design-chat-store — selectedPreviewImageUrl", () => {
  beforeEach(() => {
    useDesignChatStore.setState({
      selectedPreviewImageUrl: null,
      generatedImageUrl: null,
      resultTags: [],
      baseImageUrl: null,
      baseImageWorkId: null,
      lastRoute: null,
      lastRouteSignals: [],
      lastRouteReason: null,
      lastFalRequestId: null,
      lastSeed: null,
      lastAnalysisWorkId: null,
      lastEligibleForRender: false,
      lastMissingRequirements: [],
    });
  });

  it("setGeneratedImage는 selectedPreviewImageUrl을 같은 값으로 설정한다", () => {
    const url = 'url("https://example.com/tie.png") center/cover no-repeat';
    useDesignChatStore.getState().setGeneratedImage(url, ["네이비"]);
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBe(url);
  });

  it("setGeneratedImage(null)은 selectedPreviewImageUrl을 null로 설정한다", () => {
    useDesignChatStore.setState({
      selectedPreviewImageUrl:
        'url("https://example.com/tie.png") center/cover no-repeat',
    });
    useDesignChatStore.getState().setGeneratedImage(null, []);
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBeNull();
  });

  it("setSelectedPreviewImage는 selectedPreviewImageUrl을 업데이트한다", () => {
    const url = 'url("https://example.com/other.png") center/cover no-repeat';
    useDesignChatStore.getState().setSelectedPreviewImage(url);
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBe(url);
  });

  it("resetConversation은 selectedPreviewImageUrl을 null로 초기화한다", () => {
    useDesignChatStore.setState({
      selectedPreviewImageUrl:
        'url("https://example.com/tie.png") center/cover no-repeat',
    });
    useDesignChatStore.getState().resetConversation();
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBeNull();
  });

  it("setGenerationMetadata는 base image와 route metadata를 저장한다", () => {
    useDesignChatStore.getState().setGenerationMetadata({
      baseImageUrl: "https://example.com/base.png",
      baseImageWorkId: "work-base-1",
      lastRoute: "fal_edit",
      lastRouteSignals: ["exact_placement", "edit_only"],
      lastRouteReason: "existing_result_edit_request",
      lastFalRequestId: "fal-request-1",
      lastSeed: 1234,
    });

    expect(useDesignChatStore.getState().baseImageUrl).toBe(
      "https://example.com/base.png",
    );
    expect(useDesignChatStore.getState().baseImageWorkId).toBe("work-base-1");
    expect(useDesignChatStore.getState().lastRoute).toBe("fal_edit");
    expect(useDesignChatStore.getState().lastRouteSignals).toEqual([
      "exact_placement",
      "edit_only",
    ]);
    expect(useDesignChatStore.getState().lastRouteReason).toBe(
      "existing_result_edit_request",
    );
    expect(useDesignChatStore.getState().lastFalRequestId).toBe(
      "fal-request-1",
    );
    expect(useDesignChatStore.getState().lastSeed).toBe(1234);
  });

  it("restoreSessionState는 generatedImageUrl을 selectedPreviewImageUrl로 복원한다", () => {
    const url =
      'url("https://example.com/restored.png") center/cover no-repeat';
    useDesignChatStore.getState().restoreSessionState("session-1", {
      messages: [],
      generatedImageUrl: url,
      baseImageWorkId: "work-restored-1",
      resultTags: [],
      generationStatus: "completed",
      repeatTile: null,
      accentTile: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
    });
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBe(url);
    expect(useDesignChatStore.getState().baseImageUrl).toBe(
      "https://example.com/restored.png",
    );
    expect(useDesignChatStore.getState().baseImageWorkId).toBe(
      "work-restored-1",
    );
  });

  it("restoreSessionState에서 generatedImageUrl이 null이면 selectedPreviewImageUrl도 null이다", () => {
    useDesignChatStore.setState({
      selectedPreviewImageUrl:
        'url("https://example.com/tie.png") center/cover no-repeat',
    });
    useDesignChatStore.getState().restoreSessionState("session-1", {
      messages: [],
      generatedImageUrl: null,
      baseImageWorkId: null,
      resultTags: [],
      generationStatus: "idle",
      repeatTile: null,
      accentTile: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
    });
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBeNull();
  });

  it("restoreSessionState는 기존 inpaintTarget을 초기화한다", () => {
    useDesignChatStore.setState({
      inpaintTarget: {
        imageUrl: "https://example.com/stale.png",
        imageWorkId: "work-stale-1",
      },
    });

    useDesignChatStore.getState().restoreSessionState("session-1", {
      messages: [],
      generatedImageUrl: null,
      baseImageWorkId: null,
      resultTags: [],
      generationStatus: "idle",
      repeatTile: null,
      accentTile: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
    });

    expect(useDesignChatStore.getState().inpaintTarget).toBeNull();
  });

  it("restoreSessionState는 누락된 designContext 필드를 기본값으로 보완한다", () => {
    useDesignChatStore.getState().restoreSessionState("session-1", {
      messages: [],
      generatedImageUrl: null,
      baseImageWorkId: null,
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
});

describe("design-chat-store — tile state", () => {
  beforeEach(() => {
    useDesignChatStore.setState({
      repeatTile: null,
      accentTile: null,
      accentLayout: null,
      patternType: null,
      fabricType: null,
    });
  });

  it("초기값: 타일 관련 필드 모두 null", () => {
    const state = useDesignChatStore.getState();
    expect(state.repeatTile).toBeNull();
    expect(state.accentTile).toBeNull();
    expect(state.accentLayout).toBeNull();
    expect(state.patternType).toBeNull();
    expect(state.fabricType).toBeNull();
  });

  it("setTileResult: 타일 상태 전체 업데이트", () => {
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
});

describe("design-chat-store", () => {
  beforeEach(() => {
    useDesignChatStore.setState({
      currentSessionId: null,
      lastAnalysisWorkId: null,
      lastEligibleForRender: false,
      lastMissingRequirements: [],
    });
  });

  it("레거시 모델 선택 상태를 노출하지 않는다", () => {
    const state = useDesignChatStore.getState() as unknown as Record<
      string,
      unknown
    >;

    expect(state).not.toHaveProperty("aiModel");
    expect(state).not.toHaveProperty("setAiModel");
  });

  it("레거시 자동 렌더 토글 상태를 노출하지 않는다", () => {
    const state = useDesignChatStore.getState() as unknown as Record<
      string,
      unknown
    >;

    expect(state).not.toHaveProperty("autoGenerateImage");
    expect(state).not.toHaveProperty("setAutoGenerateImage");
  });

  it("resetConversation은 lastMissingRequirements를 새 배열로 재생성한다", () => {
    useDesignChatStore.getState().setLastAnalysisResult({
      analysisWorkId: "analysis-3",
      eligibleForRender: true,
      missingRequirements: ["ciImage"],
    });

    const previous = useDesignChatStore.getState().lastMissingRequirements;
    useDesignChatStore.getState().resetConversation();

    expect(useDesignChatStore.getState().lastMissingRequirements).toEqual([]);
    expect(useDesignChatStore.getState().lastMissingRequirements).not.toBe(
      previous,
    );
  });

  it("resetConversation은 base image와 route metadata도 초기화한다", () => {
    useDesignChatStore.getState().setGenerationMetadata({
      baseImageUrl: "https://example.com/base.png",
      baseImageWorkId: "work-base-2",
      lastRoute: "fal_tiling",
      lastRouteSignals: ["pattern_repeat"],
      lastRouteReason: "ci_image_with_pattern_repeat",
      lastFalRequestId: "fal-request-2",
      lastSeed: 4321,
    });

    useDesignChatStore.getState().resetConversation();

    expect(useDesignChatStore.getState().baseImageUrl).toBeNull();
    expect(useDesignChatStore.getState().baseImageWorkId).toBeNull();
    expect(useDesignChatStore.getState().lastRoute).toBeNull();
    expect(useDesignChatStore.getState().lastRouteSignals).toEqual([]);
    expect(useDesignChatStore.getState().lastRouteReason).toBeNull();
    expect(useDesignChatStore.getState().lastFalRequestId).toBeNull();
    expect(useDesignChatStore.getState().lastSeed).toBeNull();
  });

  it("stores last analysis status for manual render", () => {
    useDesignChatStore.getState().setLastAnalysisResult({
      analysisWorkId: "analysis-1",
      eligibleForRender: true,
      missingRequirements: ["referenceImage"],
    });

    expect(useDesignChatStore.getState().lastAnalysisWorkId).toBe("analysis-1");
    expect(useDesignChatStore.getState().lastEligibleForRender).toBe(true);
    expect(useDesignChatStore.getState().lastMissingRequirements).toEqual([
      "referenceImage",
    ]);
  });

  it("stores analysis-only snapshots with eligibleForRender=false", () => {
    useDesignChatStore.getState().setLastAnalysisResult({
      analysisWorkId: "analysis-2",
      eligibleForRender: false,
      missingRequirements: [],
    });

    expect(useDesignChatStore.getState().lastEligibleForRender).toBe(false);
  });
});
