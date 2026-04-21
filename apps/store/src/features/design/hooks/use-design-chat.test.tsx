import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as DesignEntities from "@/entities/design";
import { buildAnalysisReuseKey } from "@/entities/design";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";

const {
  invalidateQueries,
  mutate,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  setGenerationMetadata,
  resolveGenerationRoute,
  getRawImageUrlFromPreviewBackground,
  setLastAnalysisResult,
  clearAttachments,
  restoreMessages,
  setCurrentSessionId,
  setLastAnalysisReuseKey,
  phCapture,
  MockInsufficientTokensError,
} = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  mutate: vi.fn(),
  addMessage: vi.fn(),
  setGenerationStatus: vi.fn(),
  setGeneratedImage: vi.fn(),
  setGenerationMetadata: vi.fn(),
  resolveGenerationRoute: vi.fn((input: { userMessage: string }) => {
    const normalized = input.userMessage.toLowerCase();
    const isEditIntent =
      normalized.includes("위치") ||
      normalized.includes("내려") ||
      normalized.includes("올려") ||
      normalized.includes("수정") ||
      normalized.includes("변경");

    if (isEditIntent) {
      return {
        route: "fal_edit",
        signals: ["exact_placement", "edit_only"],
        reason: "existing_result_edit_request",
        usedIntentRouter: false,
      };
    }

    return {
      route: "openai",
      signals: ["new_generation"],
      reason: "default_openai_generation",
      usedIntentRouter: false,
    };
  }),
  getRawImageUrlFromPreviewBackground: vi.fn((value: string | null) => {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    const match = trimmed.match(/^url\((['"]?)(.*?)\1\)/i);
    return match?.[2] ?? trimmed;
  }),
  setLastAnalysisResult: vi.fn(),
  clearAttachments: vi.fn(),
  restoreMessages: vi.fn(),
  setCurrentSessionId: vi.fn(),
  setLastAnalysisReuseKey: vi.fn(),
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

const createReuseKey = (overrides?: {
  colors?: string[];
  pattern?: string | null;
  fabricMethod?: string | null;
  ciPlacement?: string | null;
  baseImageWorkId?: string | null;
  baseImageUrl?: string | null;
}) =>
  buildAnalysisReuseKey({
    colors: overrides?.colors ?? ["navy"],
    pattern: overrides?.pattern ?? "stripe",
    fabricMethod: overrides?.fabricMethod ?? "print",
    ciPlacement: overrides?.ciPlacement ?? null,
    baseImageWorkId: overrides?.baseImageWorkId ?? null,
    ciImageHash: null,
    referenceImageHash: null,
    baseImageUrl: overrides?.baseImageUrl ?? null,
  });

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
  selectedPreviewImageUrl: null as string | null,
  baseImageUrl: null,
  baseImageWorkId: null,
  lastRoute: null,
  lastRouteSignals: [],
  lastRouteReason: null,
  lastFalRequestId: null,
  lastSeed: null,
  lastAnalysisWorkId: "analysis-work-1",
  lastEligibleForRender: false,
  lastGenerateImage: null as boolean | null,
  lastAnalysisReuseKey: null as string | null,
  inpaintTarget: null as {
    imageUrl: string;
    imageWorkId: string | null;
  } | null,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  setGenerationMetadata,
  setLastAnalysisResult,
  setLastAnalysisReuseKey,
  clearAttachments,
  restoreMessages,
  setCurrentSessionId,
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries,
  }),
}));

vi.mock("@/entities/design", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignEntities>();

  return {
    ...actual,
    InsufficientTokensError: MockInsufficientTokensError,
    resolveGenerationRoute,
  };
});

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
  getRawImageUrlFromPreviewBackground,
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
    setGenerationMetadata.mockReset();
    resolveGenerationRoute.mockClear();
    setLastAnalysisResult.mockReset();
    clearAttachments.mockReset();
    restoreMessages.mockReset();
    setCurrentSessionId.mockReset();
    setLastAnalysisReuseKey.mockReset();
    phCapture.mockReset();
    storeState.messages = [...initialMessages];
    storeState.designContext = {
      colors: ["navy"],
      pattern: "stripe",
      fabricMethod: "print",
      ciPlacement: null,
      ciImage: null,
      referenceImage: null,
    };
    storeState.aiModel = "openai";
    storeState.autoGenerateImage = true;
    storeState.selectedPreviewImageUrl = null;
    storeState.lastAnalysisWorkId = "analysis-work-1";
    storeState.lastEligibleForRender = false;
    storeState.lastGenerateImage = null;
    storeState.lastAnalysisReuseKey = null;
    storeState.inpaintTarget = null;
    storeState.currentSessionId = null;
    storeState.baseImageUrl = null;
    storeState.baseImageWorkId = null;
    storeState.lastRoute = null;
    storeState.lastRouteSignals = [];
    storeState.lastRouteReason = null;
    storeState.lastFalRequestId = null;
    storeState.lastSeed = null;
    addMessage.mockImplementation((message) => {
      storeState.messages = [...storeState.messages, message];
    });
    restoreMessages.mockImplementation((messages) => {
      storeState.messages = messages;
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

  it("autoGenerateImage가 false여도 auto로 전송한다", () => {
    Object.assign(storeState, { autoGenerateImage: false });

    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("새 디자인", []);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: "auto",
      }),
      expect.any(Object),
    );
  });

  it("store aiModel을 요청 payload와 세션 이벤트에 반영한다", () => {
    Object.assign(storeState, { aiModel: "gemini" });

    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("새 디자인", []);

    expect(phCapture).toHaveBeenCalledWith("design_session_started", {
      ai_model: "gemini",
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        aiModel: "gemini",
      }),
      expect.any(Object),
    );
  });

  it("편집 요청은 base image 정보를 함께 전송한다", () => {
    Object.assign(storeState, {
      baseImageUrl: "https://example.com/base.png",
      baseImageWorkId: "work-base-1",
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("포인트 위치가 너무 높아 아래로 내려줘", []);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        baseImageUrl: "https://example.com/base.png",
        baseImageWorkId: "work-base-1",
      }),
      expect.any(Object),
    );
  });

  it("selectedPreviewImageUrl이 있어도 edit intent는 base image 정보를 함께 전송한다", () => {
    Object.assign(storeState, {
      baseImageUrl: null,
      baseImageWorkId: null,
      selectedPreviewImageUrl:
        'url("https://example.com/selected.png") center/cover no-repeat',
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("포인트 위치가 너무 높아 아래로 내려줘", []);

    expect(resolveGenerationRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedPreviewImageUrl:
          'url("https://example.com/selected.png") center/cover no-repeat',
      }),
    );
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        baseImageUrl: "https://example.com/selected.png",
        baseImageWorkId: null,
      }),
      expect.any(Object),
    );
  });

  it("route resolver가 상태를 바꿔도 sendMessage는 같은 스냅샷의 raw base image를 쓴다", () => {
    Object.assign(storeState, {
      baseImageUrl: null,
      baseImageWorkId: null,
      selectedPreviewImageUrl:
        'url("https://example.com/original.png") center/cover no-repeat',
    });

    const previousImplementation =
      resolveGenerationRoute.getMockImplementation();
    resolveGenerationRoute.mockImplementation(
      (input: { userMessage: string }) => {
        if (input.userMessage.includes("내려")) {
          storeState.selectedPreviewImageUrl =
            'url("https://example.com/changed.png") center/cover no-repeat';
        }

        return {
          route: "fal_edit",
          signals: ["exact_placement", "edit_only"],
          reason: "existing_result_edit_request",
          usedIntentRouter: false,
        };
      },
    );

    try {
      const { result } = renderHook(() => useDesignChat());
      result.current.sendMessage("포인트 위치가 너무 높아 아래로 내려줘", []);

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseImageUrl: "https://example.com/original.png",
        }),
        expect.any(Object),
      );
    } finally {
      if (previousImplementation) {
        resolveGenerationRoute.mockImplementation(previousImplementation);
      }
    }
  });

  it("base image가 없으면 edit intent는 mutate를 호출하지 않고 UI-only 메시지를 추가한다", () => {
    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("포인트 위치가 너무 높아 아래로 내려줘", []);

    expect(mutate).not.toHaveBeenCalled();
    expect(setCurrentSessionId).not.toHaveBeenCalled();
    expect(phCapture).not.toHaveBeenCalled();
    expect(clearAttachments).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledTimes(1);
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "ai",
        uiOnly: true,
        content:
          "현재 결과를 기준으로 수정할 이미지가 없어 먼저 디자인을 생성해 주세요.",
      }),
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
      aiModel: "gemini",
      lastAnalysisWorkId: "analysis-work-101",
      lastGenerateImage: false,
      lastEligibleForRender: true,
      lastAnalysisReuseKey: createReuseKey(),
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    expect(setGenerationStatus).toHaveBeenCalledWith("rendering");
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisWorkId: "analysis-work-101",
        executionMode: "render_from_analysis",
        aiModel: "gemini",
      }),
      expect.any(Object),
    );
  });

  it("requestRender는 현재 컨텍스트가 마지막 분석과 다르면 render_from_analysis를 재사용하지 않는다", () => {
    Object.assign(storeState, {
      designContext: {
        ...storeState.designContext,
        colors: ["burgundy"],
      },
      lastAnalysisWorkId: "analysis-work-101",
      lastEligibleForRender: true,
      lastAnalysisReuseKey: createReuseKey(),
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisWorkId: null,
        executionMode: "auto",
        designContext: expect.objectContaining({
          colors: ["burgundy"],
        }),
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
      workId: "work-design-1",
      analysisWorkId: "analysis-work-2",
      route: "fal_edit",
      routeSignals: ["exact_placement", "edit_only"],
      routeReason: "existing_result_edit_request",
      falRequestId: "fal-request-9",
      seed: 9876,
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
    expect(setGenerationMetadata).toHaveBeenCalledWith({
      baseImageUrl: "https://example.com/design.jpg",
      baseImageWorkId: "work-design-1",
      lastRoute: "fal_edit",
      lastRouteSignals: ["exact_placement", "edit_only"],
      lastRouteReason: "existing_result_edit_request",
      lastFalRequestId: "fal-request-9",
      lastSeed: 9876,
    });
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

  it("수동 렌더 성공 시에는 AI 메시지를 중복 추가하지 않고 이미지만 반영한다", () => {
    Object.assign(storeState, {
      autoGenerateImage: false,
      currentSessionId: "session-1",
      lastAnalysisWorkId: "analysis-work-5",
      lastEligibleForRender: true,
      baseImageWorkId: "work-stale-1",
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    const callbacks = mutate.mock.calls[0][1];
    callbacks.onSuccess({
      aiMessage: "분석 결과 문구",
      imageUrl: "https://example.com/rendered.jpg",
      analysisWorkId: "analysis-work-5",
      generateImage: true,
      eligibleForRender: true,
      missingRequirements: [],
      tags: ["렌더"],
      contextChips: [],
    });

    expect(addMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        role: "ai",
        content: "분석 결과 문구",
      }),
    );
    expect(setGeneratedImage).toHaveBeenCalledWith(
      'url("https://example.com/rendered.jpg") center/cover no-repeat',
      ["렌더"],
    );
    expect(restoreMessages).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ai-1",
          imageUrl: "https://example.com/rendered.jpg",
        }),
      ]),
    );
    expect(setGenerationMetadata).toHaveBeenCalledWith({
      baseImageUrl: "https://example.com/rendered.jpg",
      baseImageWorkId: null,
      lastRoute: null,
      lastRouteSignals: [],
      lastRouteReason: null,
      lastFalRequestId: null,
      lastSeed: null,
    });
  });

  it("requestRender는 마지막 analysisWorkId로 render_from_analysis 요청을 보낸다", () => {
    Object.assign(storeState, {
      autoGenerateImage: false,
      lastAnalysisWorkId: "analysis-work-99",
      lastGenerateImage: false,
      lastEligibleForRender: true,
      lastAnalysisReuseKey: createReuseKey(),
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

  it("requestRender는 최신 store sessionId를 사용한다", () => {
    Object.assign(storeState, {
      currentSessionId: "store-session-42",
      lastAnalysisWorkId: "analysis-work-103",
      lastEligibleForRender: true,
      lastAnalysisReuseKey: createReuseKey(),
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestRender();

    expect(setCurrentSessionId).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "store-session-42",
        analysisWorkId: "analysis-work-103",
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
    Object.assign(storeState, { aiModel: "gemini" });

    const { result } = renderHook(() => useDesignChat());
    result.current.regenerate();

    expect(setGenerationStatus).toHaveBeenCalledWith("regenerating");
    expect(setLastAnalysisResult).toHaveBeenCalledWith({
      analysisWorkId: null,
      eligibleForRender: false,
      missingRequirements: [],
    });
    const callbacks = mutate.mock.calls[0][1];
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        aiModel: "gemini",
      }),
      expect.any(Object),
    );

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

  it("requestInpaint는 fal_inpaint payload로 mutation을 호출한다", () => {
    storeState.inpaintTarget = {
      imageUrl: "https://example.com/base.png",
      imageWorkId: "work-1",
    };

    const { result } = renderHook(() => useDesignChat());
    result.current.requestInpaint("mask-base64", "이 부분만 자수 느낌으로");

    expect(setGenerationStatus).toHaveBeenCalledWith("rendering");
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: "이 부분만 자수 느낌으로",
        route: "fal_inpaint",
        baseImageUrl: "https://example.com/base.png",
        baseImageWorkId: "work-1",
        maskBase64: "mask-base64",
        maskMimeType: "image/png",
        editPrompt: "이 부분만 자수 느낌으로",
      }),
      expect.any(Object),
    );
  });

  it("requestInpaint는 inpaint target URL을 사용할 때 해당 target의 workId를 그대로 사용한다", () => {
    Object.assign(storeState, {
      inpaintTarget: {
        imageUrl: "https://example.com/inpaint-target.png",
        imageWorkId: null,
      },
      baseImageUrl: "https://example.com/base.png",
      baseImageWorkId: "base-work-1",
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.requestInpaint("mask-base64", "이 부분만 자수 느낌으로");

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        baseImageUrl: "https://example.com/inpaint-target.png",
        baseImageWorkId: null,
      }),
      expect.any(Object),
    );
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

  it("이미지 없는 성공 응답은 기존 baseImageWorkId를 유지한다", () => {
    Object.assign(storeState, {
      baseImageUrl: "https://example.com/existing.png",
      baseImageWorkId: "work-existing-1",
    });

    const { result } = renderHook(() => useDesignChat());
    result.current.sendMessage("새 디자인", []);

    const callbacks = mutate.mock.calls[0][1];
    callbacks.onSuccess({
      aiMessage: "분석 결과입니다.",
      imageUrl: null,
      analysisWorkId: "analysis-work-55",
      eligibleForRender: true,
      missingRequirements: [],
      tags: [],
      contextChips: [],
    });

    expect(setGenerationMetadata).toHaveBeenCalledWith({
      baseImageUrl: "https://example.com/existing.png",
      baseImageWorkId: "work-existing-1",
      lastRoute: null,
      lastRouteSignals: [],
      lastRouteReason: null,
      lastFalRequestId: null,
      lastSeed: null,
    });
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
