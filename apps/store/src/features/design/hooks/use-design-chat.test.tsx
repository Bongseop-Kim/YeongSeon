import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";

const {
  invalidateQueries,
  mutate,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  setLastAnalysisResult,
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
  setLastAnalysisResult: vi.fn(),
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
  autoGenerateImage: true,
  lastAnalysisWorkId: "analysis-work-1",
  lastEligibleForRender: false,
  lastGenerateImage: null as boolean | null,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  setLastAnalysisResult,
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
    setLastAnalysisResult.mockReset();
    clearAttachments.mockReset();
    setCurrentSessionId.mockReset();
    phCapture.mockReset();
    storeState.messages = [...initialMessages];
    storeState.autoGenerateImage = true;
    storeState.lastAnalysisWorkId = "analysis-work-1";
    storeState.lastEligibleForRender = false;
    storeState.lastGenerateImage = null;
    storeState.currentSessionId = null;
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
    expect(setLastAnalysisResult).toHaveBeenCalledWith({
      analysisWorkId: null,
      eligibleForRender: false,
      missingRequirements: [],
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: "새 디자인",
        executionMode: "auto",
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

  it("autoGenerateImage가 false면 analysis_only로 전송한다", () => {
    Object.assign(storeState, { autoGenerateImage: false });

    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("새 디자인", []);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: "analysis_only",
      }),
      expect.any(Object),
    );
  });

  it("requestRender는 analysis snapshot이 없으면 mutate를 호출하지 않는다", () => {
    Object.assign(storeState, {
      lastAnalysisWorkId: null,
      lastGenerateImage: false,
      lastEligibleForRender: false,
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    expect(mutate).not.toHaveBeenCalled();
  });

  it("requestRender는 render 불가 snapshot이면 mutate를 호출하지 않는다", () => {
    Object.assign(storeState, {
      lastAnalysisWorkId: "analysis-work-100",
      lastEligibleForRender: false,
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    expect(mutate).not.toHaveBeenCalled();
  });

  it("requestRender는 generateImage가 false여도 eligible snapshot이면 mutate를 호출한다", () => {
    Object.assign(storeState, {
      autoGenerateImage: false,
      lastAnalysisWorkId: "analysis-work-101",
      lastGenerateImage: false,
      lastEligibleForRender: true,
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    expect(setGenerationStatus).toHaveBeenCalledWith("rendering");
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisWorkId: "analysis-work-101",
        executionMode: "render_from_analysis",
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
      analysisWorkId: "analysis-work-2",
      generateImage: true,
      eligibleForRender: true,
      missingRequirements: ["referenceImage"],
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
    expect(setLastAnalysisResult).toHaveBeenCalledWith({
      analysisWorkId: "analysis-work-2",
      eligibleForRender: true,
      missingRequirements: ["referenceImage"],
    });
    expect(setGenerationStatus).toHaveBeenCalledWith("completed");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["design-token-balance"],
    });
  });

  it("requestRender는 마지막 analysisWorkId로 render_from_analysis 요청을 보낸다", () => {
    Object.assign(storeState, {
      autoGenerateImage: false,
      lastAnalysisWorkId: "analysis-work-99",
      lastGenerateImage: false,
      lastEligibleForRender: true,
    });

    const { result } = renderHook(() => useDesignChat());
    expect(result.current.requestRender).toBeTypeOf("function");

    result.current.requestRender();

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisWorkId: "analysis-work-99",
        executionMode: "render_from_analysis",
      }),
      expect.any(Object),
    );
  });

  it("requestRender는 첫 사용자 메시지가 없으면 mutate를 호출하지 않는다", () => {
    Object.assign(storeState, {
      messages: [
        {
          id: "ai-only",
          role: "ai",
          content: "분석 결과",
          timestamp: 10,
        },
      ],
      lastAnalysisWorkId: "analysis-work-102",
      lastEligibleForRender: true,
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    expect(setGenerationStatus).not.toHaveBeenCalledWith("rendering");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("재생성 중 토큰 부족 에러를 처리한다", () => {
    const { result } = renderHook(() => useDesignChat());
    result.current.regenerate();

    expect(setGenerationStatus).toHaveBeenCalledWith("regenerating");
    expect(setLastAnalysisResult).toHaveBeenCalledWith({
      analysisWorkId: null,
      eligibleForRender: false,
      missingRequirements: [],
    });
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
