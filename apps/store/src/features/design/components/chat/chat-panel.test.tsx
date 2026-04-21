import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnalysisReuseKey } from "@/entities/design";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

const { inpaintDialogSpy } = vi.hoisted(() => ({
  inpaintDialogSpy: vi.fn(),
}));
const { messageListSpy } = vi.hoisted(() => ({
  messageListSpy: vi.fn(),
}));
const { inputHandleSpy } = vi.hoisted(() => ({
  inputHandleSpy: {
    focus: vi.fn(),
    openOptions: vi.fn(),
  },
}));

vi.mock("@/features/design/components/chat/chat-header", () => ({
  ChatHeader: () => <div data-testid="chat-header" />,
}));

vi.mock("@/features/design/components/chat/tie-preview-modal", () => ({
  TiePreviewModal: () => null,
}));

vi.mock("@/features/design/components/chat/chat-input", () => ({
  ChatInput: forwardRef((_props: unknown, ref) => {
    useImperativeHandle(ref, () => inputHandleSpy);
    return <div data-testid="chat-input" />;
  }),
}));

vi.mock("@/features/design/hooks/ai-design-query", () => ({
  useDesignTokenBalanceQuery: () => ({ data: undefined }),
}));

vi.mock("@/features/design/components/chat/message-list", () => ({
  MessageList: (props: {
    onOpenOptions?: () => void;
    onFocusInput?: () => void;
  }) => {
    messageListSpy(props);
    return (
      <div data-testid="message-list">
        <button type="button" onClick={props.onOpenOptions}>
          open-options
        </button>
        <button type="button" onClick={props.onFocusInput}>
          focus-input
        </button>
      </div>
    );
  },
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
    messageListSpy.mockClear();
    inputHandleSpy.focus.mockClear();
    inputHandleSpy.openOptions.mockClear();
    useDesignChatStore.getState().resetConversation();
    useDesignChatStore.setState({
      generationStatus: "idle",
      inpaintTarget: {
        imageUrl: "https://example.com/base.png",
        imageWorkId: "work-1",
      },
    });
  });

  it("passes analysis state for the latest AI message to MessageList", () => {
    const queryClient = new QueryClient();
    useDesignChatStore.setState({
      generationStatus: "completed",
      lastAnalysisWorkId: "analysis-1",
      lastEligibleForRender: true,
      lastMissingRequirements: [],
      lastAnalysisReuseKey: buildAnalysisReuseKey({
        colors: ["#1a2c5b"],
        pattern: "stripe",
        fabricMethod: "yarn-dyed",
        ciPlacement: "one-point",
        baseImageWorkId: null,
        ciImageHash: null,
        referenceImageHash: null,
        baseImageUrl: null,
      }),
      designContext: {
        colors: ["#1a2c5b"],
        pattern: "stripe",
        fabricMethod: "yarn-dyed",
        ciImage: null,
        ciPlacement: "one-point",
        referenceImage: null,
      },
      messages: [
        {
          id: "user-1",
          role: "user",
          content: "네이비로 해줘",
          timestamp: 1,
        },
        {
          id: "ai-1",
          role: "ai",
          content: "분석 완료",
          timestamp: 2,
        },
      ],
      inpaintTarget: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChatPanel
          sendMessage={vi.fn()}
          requestInpaint={vi.fn()}
          onOpenHistory={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(messageListSpy).toHaveBeenCalled();
    expect(messageListSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      analysisState: {
        visibleMessageId: "ai-1",
        eligibleForRender: true,
        missingRequirements: [],
        summaryChips: ["네이비", "스트라이프", "원포인트"],
      },
    });
  });

  it("현재 입력이 마지막 분석과 달라지면 분석 카드를 숨긴다", () => {
    const queryClient = new QueryClient();
    useDesignChatStore.setState({
      generationStatus: "completed",
      lastAnalysisWorkId: "analysis-1",
      lastEligibleForRender: true,
      lastMissingRequirements: [],
      lastAnalysisReuseKey: buildAnalysisReuseKey({
        colors: ["#1a2c5b"],
        pattern: "stripe",
        fabricMethod: "yarn-dyed",
        ciPlacement: "one-point",
        baseImageWorkId: null,
        ciImageHash: null,
        referenceImageHash: null,
        baseImageUrl: null,
      }),
      designContext: {
        colors: ["#1a2c5b"],
        pattern: "check",
        fabricMethod: "yarn-dyed",
        ciImage: null,
        ciPlacement: "one-point",
        referenceImage: null,
      },
      messages: [
        {
          id: "ai-1",
          role: "ai",
          content: "분석 완료",
          timestamp: 2,
        },
      ],
      inpaintTarget: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChatPanel
          sendMessage={vi.fn()}
          requestInpaint={vi.fn()}
          onOpenHistory={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(messageListSpy).toHaveBeenCalled();
    expect(messageListSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      analysisState: null,
    });
  });

  it("routes analysis card helper actions to the chat input handle", () => {
    const queryClient = new QueryClient();
    useDesignChatStore.setState({
      generationStatus: "completed",
      lastAnalysisWorkId: "analysis-1",
      lastEligibleForRender: false,
      lastMissingRequirements: ["ciImage"],
      messages: [
        {
          id: "ai-1",
          role: "ai",
          content: "입력이 더 필요해요",
          timestamp: 2,
        },
      ],
      inpaintTarget: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChatPanel
          sendMessage={vi.fn()}
          requestInpaint={vi.fn()}
          onOpenHistory={vi.fn()}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "open-options" }));
    fireEvent.click(screen.getByRole("button", { name: "focus-input" }));

    expect(inputHandleSpy.openOptions).toHaveBeenCalledTimes(1);
    expect(inputHandleSpy.focus).toHaveBeenCalledTimes(1);
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
