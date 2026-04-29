import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment } from "@/features/design";
import type * as DesignEntities from "@/entities/design";

const { chatInputSpy } = vi.hoisted(() => ({
  chatInputSpy: vi.fn(),
}));

vi.mock("@/features/design/components/chat/chat-header", () => ({
  ChatHeader: () => <div data-testid="chat-header" />,
}));

vi.mock("@/features/design/components/chat/tie-preview-modal", () => ({
  TiePreviewModal: () => null,
}));

vi.mock("@/features/design/components/chat/chat-input", () => ({
  ChatInput: (props: {
    onSend: (text: string, attachments: Attachment[]) => void;
    draftText?: string;
  }) => (
    <>
      {chatInputSpy(props)}
      <button
        type="button"
        data-testid="chat-input"
        onClick={() => props.onSend("직접 입력", [])}
      >
        send
      </button>
    </>
  ),
}));

vi.mock("@/entities/design", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignEntities>();
  return {
    ...actual,
    useDesignTokenBalanceQuery: () => ({ data: undefined }),
    useDesignGenerationsQuery: () => ({
      data: [
        {
          id: "generation-1",
          userId: "user-1",
          prompt: "네이비 스트라이프",
          patternType: "one_point",
          fabricType: "printed",
          requestMetadata: {
            selectedColors: [],
            attachments: [],
            route: "tile_generation",
          },
          variants: [1, 2, 3, 4].map((index) => ({
            id: `variant-${index}`,
            generationId: "generation-1",
            index,
            repeatTile: {
              url: `https://example.com/repeat-${index}.webp`,
              workId: `repeat-work-${index}`,
            },
            accentTile: {
              url: `https://example.com/accent-${index}.webp`,
              workId: `accent-work-${index}`,
            },
            accentLayout: {
              objectDescription: "로고",
              objectSource: "text",
              color: null,
              size: "medium",
            },
            patternType: "one_point",
            fabricType: "printed",
            createdAt: "2026-04-29T00:00:00.000Z",
          })),
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z",
        },
      ],
      isLoading: false,
    }),
    useDeleteDesignGenerationMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
  };
});

const renderPanel = (sendMessage = vi.fn()) => {
  const queryClient = new QueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <ChatPanel sendMessage={sendMessage} onOpenHistory={vi.fn()} />
    </QueryClientProvider>,
  );

  return { sendMessage };
};

describe("ChatPanel", () => {
  beforeEach(() => {
    chatInputSpy.mockClear();
    useDesignChatStore.getState().resetConversation();
    useDesignChatStore.setState({
      generationStatus: "idle",
    });
  });

  it("생성 feed를 최신 결과 목록으로 표시한다", () => {
    useDesignChatStore.setState({
      generationStatus: "generating",
    });

    renderPanel();

    expect(screen.getByText(/Korean Prompt:/)).toBeInTheDocument();
    expect(screen.getByText("네이비 스트라이프")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /variant \d 선택/ }),
    ).toHaveLength(4);
  });

  it("입력 전송은 sendMessage로 연결된다", () => {
    const { sendMessage } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "send" }));
    expect(sendMessage).toHaveBeenCalledWith("직접 입력", []);
  });

  it("프롬프트 재사용은 입력 draft로 전달된다", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "프롬프트 재사용" }));
    await vi.waitFor(() => {
      expect(chatInputSpy.mock.calls.at(-1)?.[0]).toMatchObject({
        draftText: "네이비 스트라이프",
      });
    });
  });
});
