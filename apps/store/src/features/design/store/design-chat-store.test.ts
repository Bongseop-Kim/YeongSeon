import { beforeEach, describe, expect, it } from "vitest";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

describe("design-chat-store — selectedPreviewImageUrl", () => {
  beforeEach(() => {
    useDesignChatStore.setState({
      selectedPreviewImageUrl: null,
      generatedImageUrl: null,
      resultTags: [],
      autoGenerateImage: true,
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

  it("restoreSessionState는 generatedImageUrl을 selectedPreviewImageUrl로 복원한다", () => {
    const url =
      'url("https://example.com/restored.png") center/cover no-repeat';
    useDesignChatStore.getState().restoreSessionState("session-1", {
      messages: [],
      generatedImageUrl: url,
      resultTags: [],
      generationStatus: "completed",
    });
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBe(url);
  });

  it("restoreSessionState에서 generatedImageUrl이 null이면 selectedPreviewImageUrl도 null이다", () => {
    useDesignChatStore.setState({
      selectedPreviewImageUrl:
        'url("https://example.com/tie.png") center/cover no-repeat',
    });
    useDesignChatStore.getState().restoreSessionState("session-1", {
      messages: [],
      generatedImageUrl: null,
      resultTags: [],
      generationStatus: "idle",
    });
    expect(useDesignChatStore.getState().selectedPreviewImageUrl).toBeNull();
  });
});

describe("design-chat-store — autoGenerateImage", () => {
  beforeEach(() => {
    useDesignChatStore.setState({
      autoGenerateImage: true,
      currentSessionId: null,
      lastAnalysisWorkId: null,
      lastEligibleForRender: false,
      lastMissingRequirements: [],
    });
  });

  it("defaults autoGenerateImage to true", () => {
    expect(useDesignChatStore.getState().autoGenerateImage).toBe(true);
  });

  it("setAutoGenerateImage는 autoGenerateImage를 업데이트한다", () => {
    useDesignChatStore.getState().setAutoGenerateImage(false);
    expect(useDesignChatStore.getState().autoGenerateImage).toBe(false);
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

  it("setAiModel는 currentSessionId를 초기화한다", () => {
    useDesignChatStore.setState({
      aiModel: "openai",
      currentSessionId: "session-123",
    });

    useDesignChatStore.getState().setAiModel("gemini");

    expect(useDesignChatStore.getState().aiModel).toBe("gemini");
    expect(useDesignChatStore.getState().currentSessionId).toBeNull();
  });
});
