import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";

const {
  invalidateQueries,
  mutate,
  saveSessionMutate,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  clearAttachments,
  setCurrentSessionId,
  MockInsufficientTokensError,
} = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  mutate: vi.fn(),
  saveSessionMutate: vi.fn(),
  addMessage: vi.fn(),
  setGenerationStatus: vi.fn(),
  setGeneratedImage: vi.fn(),
  clearAttachments: vi.fn(),
  setCurrentSessionId: vi.fn(),
  MockInsufficientTokensError: class MockInsufficientTokensError extends Error {
    constructor(
      public readonly balance: number,
      public readonly cost: number,
    ) {
      super("insufficient_tokens");
      this.name = "InsufficientTokensError";
    }
  },
}));

const storeState = {
  messages: [
    {
      id: "ai-1",
      role: "ai",
      content: "이전 답변",
      timestamp: 1,
    },
    {
      id: "user-1",
      role: "user",
      content: "이전 요청",
      attachments: [],
      timestamp: 2,
      designContext: {
        colors: ["navy"],
        pattern: "stripe",
        fabricMethod: "print",
        ciPlacement: null,
        ciImage: null,
        referenceImage: null,
      },
    },
    {
      id: "ui-1",
      role: "ai",
      content: "  ",
      timestamp: 3,
      uiOnly: true,
    },
  ],
  designContext: {
    colors: ["navy"],
    pattern: "stripe",
    fabricMethod: "print",
    ciPlacement: null,
    ciImage: null,
    referenceImage: null,
  },
  aiModel: "openai",
  generationStatus: "idle",
  currentSessionId: null,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  clearAttachments,
  setCurrentSessionId,
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries,
  }),
}));

vi.mock("@/entities/design", () => ({
  InsufficientTokensError: MockInsufficientTokensError,
}));

vi.mock("@/features/design/hooks/ai-design-query", () => ({
  DESIGN_TOKEN_BALANCE_QUERY_KEY: ["design-token-balance"],
  useAiDesignMutation: () => ({
    mutate,
  }),
}));

vi.mock("@/features/design/hooks/design-session-query", () => ({
  useSaveDesignSessionMutation: () => ({
    mutate: saveSessionMutate,
  }),
}));

vi.mock("@/features/design/utils/imagekit-upload", () => ({
  uploadGeneratedImage: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/features/design/store/design-chat-store", () => ({
  useDesignChatStore: Object.assign(
    (selector: (state: typeof storeState) => unknown) => selector(storeState),
    {
      getState: () => storeState,
      setState: vi.fn(),
    },
  ),
}));

describe("useDesignChat", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-1"),
    });
    invalidateQueries.mockReset();
    mutate.mockReset();
    saveSessionMutate.mockReset();
    addMessage.mockReset();
    setGenerationStatus.mockReset();
    setGeneratedImage.mockReset();
    clearAttachments.mockReset();
    setCurrentSessionId.mockReset();
  });

  it("빈 메시지는 무시하고 일반 메시지는 mutation을 호출한다", () => {
    const { result } = renderHook(() => useDesignChat());

    result.current.sendMessage("   ", []);
    expect(mutate).not.toHaveBeenCalled();

    result.current.sendMessage("새 디자인", [
      { type: "color", label: "네이비", value: "navy" },
    ]);

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "user",
        content: "새 디자인",
      }),
    );
    expect(clearAttachments).toHaveBeenCalled();
    expect(setGenerationStatus).toHaveBeenCalledWith("generating");
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: "새 디자인",
        conversationHistory: [
          { role: "ai", content: "이전 답변" },
          { role: "user", content: "이전 요청" },
          { role: "user", content: "새 디자인" },
        ],
      }),
      expect.any(Object),
    );
  });

  it("성공 시 AI 메시지와 생성 이미지를 반영한다", () => {
    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("새 디자인", []);

    const callbacks = mutate.mock.calls[0][1];
    callbacks.onSuccess({
      aiMessage: "시안을 만들었습니다.",
      imageUrl: "https://example.com/design.jpg",
      tags: ["네이비"],
      contextChips: [],
    });

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "ai",
        content: "시안을 만들었습니다.",
        imageUrl:
          'url("https://example.com/design.jpg") center/cover no-repeat',
      }),
    );
    expect(setGeneratedImage).toHaveBeenCalledWith(
      'url("https://example.com/design.jpg") center/cover no-repeat',
      ["네이비"],
    );
    expect(setGenerationStatus).toHaveBeenCalledWith("completed");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["design-token-balance"],
    });
  });

  it("재생성 중 토큰 부족 에러를 처리한다", () => {
    const { result } = renderHook(() => useDesignChat());
    result.current.regenerate();

    expect(setGenerationStatus).toHaveBeenCalledWith("regenerating");
    const callbacks = mutate.mock.calls[0][1];

    callbacks.onError(new MockInsufficientTokensError(3, 5));
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        uiOnly: true,
        content: "토큰이 부족합니다. 현재 잔액: 3토큰, 필요: 5토큰",
      }),
    );
    expect(setGenerationStatus).toHaveBeenCalledWith("idle");
  });

  it("재생성 중 일반 에러를 처리한다", () => {
    const { result } = renderHook(() => useDesignChat());
    result.current.regenerate();

    const callbacks = mutate.mock.calls[0][1];
    callbacks.onError(new Error("boom"));
    expect(setGenerationStatus).toHaveBeenCalledWith("completed");
  });
});
