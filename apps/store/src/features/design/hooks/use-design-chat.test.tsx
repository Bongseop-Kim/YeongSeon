import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as DesignEntities from "@/entities/design";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";

const {
  invalidateQueries,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  clearAttachments,
  setCurrentSessionId,
  setTileResult,
  callTileGeneration,
  uploadDesignAsset,
  phCapture,
  MockInsufficientTokensError,
} = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  addMessage: vi.fn(),
  setGenerationStatus: vi.fn(),
  setGeneratedImage: vi.fn(),
  clearAttachments: vi.fn(),
  setCurrentSessionId: vi.fn(),
  setTileResult: vi.fn(),
  callTileGeneration: vi.fn(),
  uploadDesignAsset: vi.fn(),
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

const defaultDesignContext = {
  colors: ["navy"],
  pattern: "stripe",
  fabricMethod: "print",
  sourceImage: null,
  onePointOffsetX: 0,
  onePointOffsetY: 0,
  ciPlacement: null,
  ciImage: null,
  referenceImage: null,
} as const;

const initialMessages = [
  {
    id: "user-previous",
    role: "user",
    content: "이전 요청",
    timestamp: 1,
    designContext: defaultDesignContext,
  },
] as const;

const storeState = {
  messages: [...initialMessages],
  designContext: { ...defaultDesignContext },
  generationStatus: "idle",
  currentSessionId: null as string | null,
  pendingAttachments: [],
  repeatTile: null as { url: string; workId: string } | null,
  accentTile: null as { url: string; workId: string } | null,
  accentLayout: null,
  patternType: null as "all_over" | "one_point" | null,
  fabricType: null as "yarn_dyed" | "printed" | null,
  addMessage,
  setGenerationStatus,
  setGeneratedImage,
  clearAttachments,
  setCurrentSessionId,
  setTileResult,
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
    callTileGeneration,
    uploadDesignAsset,
  };
});

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
    },
  ),
}));

describe("useDesignChat", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-1"),
    });
    invalidateQueries.mockReset();
    addMessage.mockReset();
    setGenerationStatus.mockReset();
    setGeneratedImage.mockReset();
    clearAttachments.mockReset();
    setCurrentSessionId.mockReset();
    setTileResult.mockReset();
    callTileGeneration.mockReset();
    uploadDesignAsset.mockReset();
    phCapture.mockReset();

    storeState.messages = [...initialMessages];
    storeState.designContext = { ...defaultDesignContext };
    storeState.generationStatus = "idle";
    storeState.currentSessionId = null;
    storeState.repeatTile = null;
    storeState.accentTile = null;
    storeState.accentLayout = null;
    storeState.patternType = null;
    storeState.fabricType = null;

    addMessage.mockImplementation((message) => {
      storeState.messages = [...storeState.messages, message];
    });
    setTileResult.mockImplementation((result) => {
      storeState.repeatTile = result.repeatTile;
      storeState.accentTile = result.accentTile;
      storeState.accentLayout = result.accentLayout;
      storeState.patternType = result.patternType;
      storeState.fabricType = result.fabricType;
    });
    callTileGeneration.mockResolvedValue({
      repeatTile: {
        url: "https://example.com/repeat.webp",
        workId: "repeat-work-1",
      },
      accentTile: null,
      patternType: "all_over",
      fabricType: "printed",
      accentLayout: null,
    });
    uploadDesignAsset.mockResolvedValue({
      signedUrl: "https://project.supabase.co/storage/v1/object/sign/ref.png",
      storagePath: "user-1/ref.png",
      hash: "hash-1",
    });
  });

  it("빈 메시지는 무시하고 일반 메시지는 타일 생성을 호출한다", async () => {
    const { result } = renderHook(() => useDesignChat());

    result.current.sendMessage("   ", []);
    expect(callTileGeneration).not.toHaveBeenCalled();

    result.current.sendMessage("새 디자인", []);

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "user",
        content: "새 디자인",
      }),
    );
    expect(clearAttachments).toHaveBeenCalledOnce();
    expect(setGenerationStatus).toHaveBeenCalledWith("generating");

    await waitFor(() => {
      expect(callTileGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          route: "tile_generation",
          userMessage: "새 디자인",
          uiFabricType: "printed",
          selectedColors: ["navy"],
          sessionId: "uuid-1",
          workflowId: "uuid-1",
        }),
      );
    });
    expect(setGeneratedImage).toHaveBeenCalledWith(
      'url("https://example.com/repeat.webp") center/cover no-repeat',
      [],
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["design-token-balance"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["design-sessions"],
    });
    expect(phCapture).toHaveBeenCalledWith("design_session_started", {
      ai_model: "openai",
    });
  });

  it("첨부 이미지 파일은 업로드된 signedUrl로 타일 생성에 전달한다", async () => {
    const { result } = renderHook(() => useDesignChat());
    const file = new File(["binary"], "reference.png", { type: "image/png" });

    result.current.sendMessage("이 이미지 참고", [
      {
        type: "image",
        label: "참고 이미지",
        value: "reference",
        file,
      },
    ]);

    await waitFor(() => {
      expect(uploadDesignAsset).toHaveBeenCalledWith(file, {
        kind: "reference",
      });
      expect(callTileGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          attachedImageUrls: [
            "https://project.supabase.co/storage/v1/object/sign/ref.png",
          ],
        }),
      );
    });
  });

  it("기존 repeatTile이 있으면 regenerate가 tile_edit으로 재요청한다", async () => {
    storeState.currentSessionId = "session-existing";
    storeState.repeatTile = {
      url: "https://example.com/existing-repeat.webp",
      workId: "repeat-work-existing",
    };
    const { result } = renderHook(() => useDesignChat());

    result.current.regenerate();

    await waitFor(() => {
      expect(callTileGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          route: "tile_edit",
          userMessage: "이전 요청",
          sessionId: "session-existing",
        }),
      );
    });
    expect(phCapture).not.toHaveBeenCalled();
  });

  it("토큰 부족 오류는 사용자 메시지로 표시하고 idle로 되돌린다", async () => {
    callTileGeneration.mockRejectedValue(new MockInsufficientTokensError(1, 3));
    const { result } = renderHook(() => useDesignChat());

    result.current.sendMessage("새 디자인", []);

    await waitFor(() => {
      expect(addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "ai",
          uiOnly: true,
          content: expect.stringMatching(/잔액:\s*1.*필요:\s*3/s),
        }),
      );
    });
    expect(setGenerationStatus).toHaveBeenLastCalledWith("idle");
  });
});
