import { beforeEach, describe, expect, it } from "vitest";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

describe("design-chat-store — selectedPreviewImageUrl", () => {
  beforeEach(() => {
    useDesignChatStore.setState({
      selectedPreviewImageUrl: null,
      generatedImageUrl: null,
      resultTags: [],
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
