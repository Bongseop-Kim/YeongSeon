import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";

const {
  invalidateQueries,
  mutate,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  clearAttachments,
  setCurrentSessionId,
  phCapture,
  MockInsufficientTokensError,
} = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  mutate: vi.fn(),
  addMessage: vi.fn(),
  setGenerationStatus: vi.fn(),
  setGeneratedImage: vi.fn(),
  clearAttachments: vi.fn(),
  setCurrentSessionId: vi.fn(),
  phCapture: vi.fn(),
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

const initialMessages = [
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
    attachments: [
      {
        type: "image",
        label: "참고 이미지",
        value: "reference",
      },
    ],
    imageUrl: "https://example.com/reference.png",
    imageFileId: "file-existing-reference",
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
] as const;

const storeState = {
  messages: [...initialMessages],
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

vi.mock("@/shared/lib/posthog", () => ({
  ph: {
    capture: phCapture,
  },
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
    addMessage.mockReset();
    setGenerationStatus.mockReset();
    setGeneratedImage.mockReset();
    clearAttachments.mockReset();
    setCurrentSessionId.mockReset();
    phCapture.mockReset();
    storeState.messages = [...initialMessages];
    addMessage.mockImplementation((message) => {
      storeState.messages = [...storeState.messages, message];
    });
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
        sessionId: expect.any(String),
        firstMessage: expect.any(String),
        allMessages: expect.arrayContaining([
          expect.objectContaining({
            id: "user-1",
            imageUrl: "https://example.com/reference.png",
            imageFileId: "file-existing-reference",
            attachments: [
              expect.objectContaining({
                type: "image",
                value: "reference",
              }),
            ],
          }),
          expect.objectContaining({
            content: "새 디자인",
            attachments: [
              expect.objectContaining({
                type: "color",
                value: "navy",
              }),
            ],
          }),
        ]),
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
        imageUrl: "https://example.com/design.jpg",
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

  it("onGenerationStart는 sendMessage 시 sessionId와 함께 호출된다", () => {
    const onGenerationStart = vi.fn();
    const { result } = renderHook(() => useDesignChat({ onGenerationStart }));
    result.current.sendMessage("새 디자인", []);
    expect(onGenerationStart).toHaveBeenCalledWith(expect.any(String));
  });

  it("onGenerationEnd는 성공 시 호출된다", () => {
    const onGenerationEnd = vi.fn();
    const { result } = renderHook(() => useDesignChat({ onGenerationEnd }));
    result.current.sendMessage("새 디자인", []);

    const callbacks = mutate.mock.calls[0][1];
    callbacks.onSuccess({
      aiMessage: "시안을 만들었습니다.",
      imageUrl: null,
      tags: [],
      contextChips: [],
    });
    expect(onGenerationEnd).toHaveBeenCalledOnce();
  });

  it("onGenerationEnd는 에러 시에도 호출된다", () => {
    const onGenerationEnd = vi.fn();
    const { result } = renderHook(() => useDesignChat({ onGenerationEnd }));
    result.current.sendMessage("새 디자인", []);

    const callbacks = mutate.mock.calls[0][1];
    callbacks.onError(new Error("boom"));
    expect(onGenerationEnd).toHaveBeenCalledOnce();
  });

  describe("design_session_started 이벤트", () => {
    it("첫 번째 sendMessage 호출 시 design_session_started를 캡처한다", () => {
      const { result } = renderHook(() => useDesignChat());
      result.current.sendMessage("네이비 타이 만들어줘", []);
      expect(phCapture).toHaveBeenCalledWith("design_session_started", {
        ai_model: "openai",
      });
    });

    describe("currentSessionId가 이미 있는 경우", () => {
      beforeEach(() => {
        Object.assign(storeState, { currentSessionId: "existing-session" });
      });

      afterEach(() => {
        Object.assign(storeState, { currentSessionId: null });
      });

      it("design_session_started를 캡처하지 않는다", () => {
        const { result } = renderHook(() => useDesignChat());
        result.current.sendMessage("추가 요청", []);
        expect(phCapture).not.toHaveBeenCalledWith(
          "design_session_started",
          expect.anything(),
        );
      });
    });
  });
});
