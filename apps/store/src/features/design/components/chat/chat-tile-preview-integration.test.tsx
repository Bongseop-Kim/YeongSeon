import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as DesignEntities from "@/entities/design";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { TieCanvas } from "@/features/design/components/preview/tie-canvas";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({ isMobile: false, isDesktop: true }),
}));

vi.mock("@/features/design/components/chat/chat-header", () => ({
  ChatHeader: () => null,
}));

vi.mock("@/features/design/components/chat/tie-preview-modal", () => ({
  TiePreviewModal: () => null,
}));

vi.mock("@/features/design/components/chat/chat-input", () => ({
  ChatInput: () => null,
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
          patternType: "all_over",
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
              url:
                index === 1
                  ? "https://example.com/repeat.webp"
                  : `https://example.com/repeat-${index}.webp`,
              workId: `repeat-work-${index}`,
            },
            accentTile: null,
            accentLayout: null,
            patternType: "all_over",
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

const renderChatWithCanvas = () => {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <div>
        <TieCanvas />
        <ChatPanel sendMessage={vi.fn()} onOpenHistory={vi.fn()} />
      </div>
    </QueryClientProvider>,
  );
};

describe("chat tile preview integration", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    useDesignChatStore.getState().resetConversation();
  });

  it("feed 타일 클릭은 메인 타이 캔버스를 반복 타일 배치로 전환한다", async () => {
    useDesignChatStore.setState({
      messages: [
        {
          id: "msg-1",
          role: "ai",
          content: "타일 기반 디자인을 생성했습니다.",
          imageUrl: "https://example.com/repeat.webp",
          timestamp: 1,
        },
      ],
      repeatTile: null,
      selectedPreviewImageUrl:
        'url("https://example.com/repeat.webp") center/cover no-repeat',
    });

    const { container } = renderChatWithCanvas();
    const findTileLayer = () =>
      Array.from(container.querySelectorAll("div")).find(
        (element) => element.style.backgroundRepeat === "repeat",
      );

    expect(findTileLayer()).toBeUndefined();

    await userEvent.click(
      screen.getByRole("button", { name: "variant 1 선택" }),
    );

    const tileLayer = findTileLayer();
    expect(tileLayer?.style.backgroundImage).toBe(
      'url("https://example.com/repeat.webp")',
    );
    expect(tileLayer?.style.backgroundSize).toBe("35px 35px");
  });
});
