import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

const { inpaintDialogSpy } = vi.hoisted(() => ({
  inpaintDialogSpy: vi.fn(),
}));

vi.mock("@/features/design/components/chat/chat-header", () => ({
  ChatHeader: () => <div data-testid="chat-header" />,
}));

vi.mock("@/features/design/components/chat/tie-preview-modal", () => ({
  TiePreviewModal: () => null,
}));

vi.mock("@/features/design/components/chat/chat-input", () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}));

vi.mock("@/features/design/hooks/ai-design-query", () => ({
  useDesignTokenBalanceQuery: () => ({ data: undefined }),
}));

vi.mock("@/features/design/components/chat/message-list", () => ({
  MessageList: () => <div data-testid="message-list" />,
}));

vi.mock("@/features/design/components/inpaint/inpaint-dialog", () => ({
  InpaintDialog: (props: {
    open: boolean;
    isSubmitting: boolean;
    onSubmit: (maskBase64: string, editPrompt: string) => void;
    onOpenChange: (open: boolean) => void;
  }) => {
    inpaintDialogSpy(props);
    return (
      <div
        data-testid="inpaint-dialog"
        data-open={String(props.open)}
        data-submitting={String(props.isSubmitting)}
      >
        <button
          type="button"
          onClick={() => props.onSubmit("mask-base64", "이 부분만 수정")}
        >
          submit
        </button>
        <button type="button" onClick={() => props.onOpenChange(false)}>
          close
        </button>
      </div>
    );
  },
}));

describe("ChatPanel", () => {
  beforeEach(() => {
    inpaintDialogSpy.mockClear();
    useDesignChatStore.getState().resetConversation();
    useDesignChatStore.setState({
      generationStatus: "idle",
      inpaintTarget: {
        imageUrl: "https://example.com/base.png",
        imageWorkId: "work-1",
      },
    });
  });

  it("keeps the inpaint dialog open until rendering finishes", async () => {
    const user = userEvent.setup();
    const requestInpaint = vi.fn();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ChatPanel
          sendMessage={vi.fn()}
          requestInpaint={requestInpaint}
          onOpenHistory={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "submit" }));

    expect(requestInpaint).toHaveBeenCalledWith(
      "mask-base64",
      "이 부분만 수정",
    );
    expect(screen.getByTestId("inpaint-dialog")).toHaveAttribute(
      "data-submitting",
      "false",
    );
    expect(useDesignChatStore.getState().inpaintTarget).toEqual({
      imageUrl: "https://example.com/base.png",
      imageWorkId: "work-1",
    });

    act(() => {
      useDesignChatStore.setState({ generationStatus: "rendering" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("inpaint-dialog")).toHaveAttribute(
        "data-submitting",
        "true",
      );
    });

    act(() => {
      useDesignChatStore.setState({ generationStatus: "completed" });
    });

    await waitFor(() => {
      expect(useDesignChatStore.getState().inpaintTarget).toBeNull();
      expect(screen.queryByTestId("inpaint-dialog")).not.toBeInTheDocument();
    });
  });

  it("does not close a newly opened dialog when the previous inpaint completes", async () => {
    const user = userEvent.setup();
    const requestInpaint = vi.fn();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ChatPanel
          sendMessage={vi.fn()}
          requestInpaint={requestInpaint}
          onOpenHistory={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "submit" }));

    act(() => {
      useDesignChatStore.setState({ generationStatus: "rendering" });
      useDesignChatStore
        .getState()
        .openInpaintDialog("https://example.com/next.png", "work-2");
    });

    await waitFor(() => {
      expect(useDesignChatStore.getState().inpaintTarget).toEqual({
        imageUrl: "https://example.com/next.png",
        imageWorkId: "work-2",
      });
    });

    act(() => {
      useDesignChatStore.setState({ generationStatus: "completed" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("inpaint-dialog")).toBeInTheDocument();
    });

    expect(useDesignChatStore.getState().inpaintTarget).toEqual({
      imageUrl: "https://example.com/next.png",
      imageWorkId: "work-2",
    });
  });
});
