import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment } from "@/features/design";
import type * as DesignEntities from "@/entities/design";

const { messageListSpy } = vi.hoisted(() => ({
  messageListSpy: vi.fn(),
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
  }) => (
    <button
      type="button"
      data-testid="chat-input"
      onClick={() => props.onSend("직접 입력", [])}
    >
      send
    </button>
  ),
}));

vi.mock("@/entities/design", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignEntities>();
  return {
    ...actual,
    useDesignTokenBalanceQuery: () => ({ data: undefined }),
  };
});

vi.mock("@/features/design/components/chat/message-list", () => ({
  MessageList: (props: {
    messages: unknown[];
    isTyping: boolean;
    onChipClick?: (text: string) => void;
  }) => {
    messageListSpy(props);
    return (
      <div data-testid="message-list">
        <button type="button" onClick={() => props.onChipClick?.("칩 요청")}>
          chip
        </button>
      </div>
    );
  },
}));

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
    messageListSpy.mockClear();
    useDesignChatStore.getState().resetConversation();
    useDesignChatStore.setState({
      generationStatus: "idle",
    });
  });

  it("메시지가 있으면 MessageList에 생성 상태와 메시지를 전달한다", () => {
    useDesignChatStore.setState({
      generationStatus: "generating",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "네이비 스트라이프",
          timestamp: 1,
        },
      ],
    });

    renderPanel();

    expect(screen.getByTestId("message-list")).toBeInTheDocument();
    expect(messageListSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      isTyping: true,
      messages: [
        expect.objectContaining({
          id: "msg-1",
          content: "네이비 스트라이프",
        }),
      ],
    });
    expect(messageListSpy.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      "analysisState",
    );
    expect(messageListSpy.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      "onRequestInpaint",
    );
  });

  it("입력 전송은 sendMessage로 연결된다", () => {
    const { sendMessage } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "send" }));
    expect(sendMessage).toHaveBeenCalledWith("직접 입력", []);
  });
});
