import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MessageBubble } from "@/features/design/components/chat/message-bubble";

const breakpoint = { isMobile: true, isDesktop: false };

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => breakpoint,
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
    const imageUrl = "https://example.com/tie.png";
    render(
      <MessageBubble
        message={{ ...baseMessage, imageUrl }}
        onTiePreviewClick={onTiePreviewClick}
      />,
    );

    const preview = screen.getByRole("button", { name: /넥타이 프리뷰/i });
    await userEvent.click(preview);

    expect(onTiePreviewClick).toHaveBeenCalledOnce();
    expect(onTiePreviewClick).toHaveBeenCalledWith(
      'url("https://example.com/tie.png") center/cover no-repeat',
    );
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

describe("MessageBubble — PC 넥타이 썸네일", () => {
  beforeEach(() => {
    breakpoint.isMobile = false;
    breakpoint.isDesktop = true;
  });

  afterEach(() => {
    breakpoint.isMobile = true;
    breakpoint.isDesktop = false;
  });

  it("imageUrl이 있을 때 PC에서 썸네일 버튼을 렌더링한다", () => {
    render(
      <MessageBubble
        message={{ ...baseMessage, imageUrl: "https://example.com/tie.png" }}
        selectedPreviewImageUrl={null}
        onSelectPreview={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "넥타이 프리뷰 선택" }),
    ).toBeInTheDocument();
  });

  it("선택된 썸네일에 aria-pressed=true와 체크 배지가 표시된다", () => {
    const previewBackground =
      'url("https://example.com/tie.png") center/cover no-repeat';
    render(
      <MessageBubble
        message={{ ...baseMessage, imageUrl: "https://example.com/tie.png" }}
        selectedPreviewImageUrl={previewBackground}
        onSelectPreview={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "넥타이 프리뷰 선택" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("선택됨")).toBeInTheDocument();
  });

  it("비선택 썸네일에 aria-pressed=false이고 체크 배지가 없다", () => {
    render(
      <MessageBubble
        message={{ ...baseMessage, imageUrl: "https://example.com/tie.png" }}
        selectedPreviewImageUrl={null}
        onSelectPreview={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "넥타이 프리뷰 선택" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByLabelText("선택됨")).toBeNull();
  });

  it("썸네일 클릭 시 previewBackground 값으로 onSelectPreview를 호출한다", async () => {
    const onSelectPreview = vi.fn();
    render(
      <MessageBubble
        message={{ ...baseMessage, imageUrl: "https://example.com/tie.png" }}
        selectedPreviewImageUrl={null}
        onSelectPreview={onSelectPreview}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "넥타이 프리뷰 선택" }),
    );
    expect(onSelectPreview).toHaveBeenCalledOnce();
    expect(onSelectPreview).toHaveBeenCalledWith(
      'url("https://example.com/tie.png") center/cover no-repeat',
    );
  });

  it("imageUrl이 없으면 PC 썸네일이 렌더링되지 않는다", () => {
    render(
      <MessageBubble
        message={{ ...baseMessage }}
        selectedPreviewImageUrl={null}
        onSelectPreview={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "넥타이 프리뷰 선택" }),
    ).toBeNull();
  });

  it("AI 이미지가 있으면 부분 수정 버튼을 렌더링하고 콜백을 호출한다", async () => {
    const onRequestInpaint = vi.fn();

    render(
      <MessageBubble
        message={{
          ...baseMessage,
          imageUrl: "https://example.com/tie.png",
          workId: "work-image-1",
        }}
        selectedPreviewImageUrl={null}
        onSelectPreview={vi.fn()}
        onRequestInpaint={onRequestInpaint}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "부분 수정" }));

    expect(onRequestInpaint).toHaveBeenCalledWith(
      "https://example.com/tie.png",
      "work-image-1",
    );
  });
});
