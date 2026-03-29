import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageBubble } from "@/features/design/components/chat/message-bubble";

// useBreakpoint mock
vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({ isMobile: true, isDesktop: false }),
}));

const baseMessage = {
  id: "msg-1",
  role: "ai" as const,
  content: "넥타이 생성 완료",
  timestamp: Date.now(),
};

describe("MessageBubble — 모바일 넥타이 프리뷰", () => {
  it("imageUrl이 있을 때 모바일에서 넥타이 프리뷰를 탭하면 onTiePreviewClick을 호출한다", async () => {
    const onTiePreviewClick = vi.fn();
    const imageUrl = "linear-gradient(to bottom, red, blue)";
    render(
      <MessageBubble
        message={{ ...baseMessage, imageUrl }}
        onTiePreviewClick={onTiePreviewClick}
      />,
    );

    const preview = screen.getByRole("button", { name: /넥타이 프리뷰/i });
    await userEvent.click(preview);

    expect(onTiePreviewClick).toHaveBeenCalledOnce();
    expect(onTiePreviewClick).toHaveBeenCalledWith(imageUrl);
  });

  it("imageUrl이 없으면 넥타이 프리뷰 버튼이 렌더링되지 않는다", () => {
    render(
      <MessageBubble
        message={{ ...baseMessage }}
        onTiePreviewClick={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /넥타이 프리뷰/i })).toBeNull();
  });
});
