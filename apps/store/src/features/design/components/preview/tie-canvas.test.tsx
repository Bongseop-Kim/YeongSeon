import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TieCanvas } from "@/features/design/components/preview/tie-canvas";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

describe("TieCanvas", () => {
  beforeEach(() => {
    useDesignChatStore.getState().resetConversation();
  });

  it("반복 타일 프리뷰에서도 넥타이 그림자를 렌더링한다", () => {
    act(() => {
      useDesignChatStore.getState().setTileResult({
        repeatTile: {
          url: "https://example.com/repeat.webp",
          workId: "repeat-work",
        },
        accentTile: null,
        accentLayout: null,
        patternType: "all_over",
        fabricType: "printed",
      });
    });

    const { container } = render(<TieCanvas />);

    const shadow = container.querySelector('img[src="/images/tieShadow.png"]');
    expect(shadow).toBeInTheDocument();
  });

  it("반복 타일을 35px 크기로 촘촘하게 배치한다", () => {
    act(() => {
      useDesignChatStore.getState().setTileResult({
        repeatTile: {
          url: "https://example.com/repeat.webp",
          workId: "repeat-work",
        },
        accentTile: null,
        accentLayout: null,
        patternType: "all_over",
        fabricType: "printed",
      });
    });

    const { container } = render(<TieCanvas />);

    const tileLayer = Array.from(container.querySelectorAll("div")).find(
      (element) => element.style.backgroundRepeat === "repeat",
    );
    expect(tileLayer).toBeInTheDocument();
    expect(tileLayer?.style.backgroundSize).toBe("35px 35px");
  });

  it("workId 없는 채팅 선택 타일도 반복 배치로 렌더링한다", () => {
    act(() => {
      useDesignChatStore.getState().setSelectedTilePreview({
        previewBackground:
          'url("https://example.com/legacy-repeat.webp") center/cover no-repeat',
        repeatTile: {
          url: "https://example.com/legacy-repeat.webp",
          workId: null,
        },
        accentTile: null,
        patternType: "all_over",
      });
    });

    const { container } = render(<TieCanvas />);

    const tileLayer = Array.from(container.querySelectorAll("div")).find(
      (element) => element.style.backgroundRepeat === "repeat",
    );
    expect(tileLayer?.style.backgroundImage).toBe(
      'url("https://example.com/legacy-repeat.webp")',
    );
    expect(tileLayer?.style.backgroundSize).toBe("35px 35px");
  });

  it("데스크톱 확대경이 커서 위치의 렌더된 프리뷰를 확대한다", () => {
    act(() => {
      useDesignChatStore.getState().setTileResult({
        repeatTile: {
          url: "https://example.com/repeat.webp",
          workId: "repeat-work",
        },
        accentTile: null,
        accentLayout: null,
        patternType: "all_over",
        fabricType: "printed",
      });
    });

    render(<TieCanvas enableMagnifier />);

    const zoomSurface = screen.getByTestId("design-preview-zoom-surface");
    vi.spyOn(zoomSurface, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 316,
      height: 600,
      right: 326,
      bottom: 620,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    fireEvent.pointerEnter(zoomSurface);
    fireEvent.pointerMove(zoomSurface, {
      clientX: 168,
      clientY: 320,
      pointerType: "mouse",
    });

    expect(screen.getByTestId("design-preview-magnifier")).toHaveStyle({
      left: "158px",
      top: "300px",
    });
    expect(screen.getByTestId("design-preview-magnified-content")).toHaveStyle({
      left: "-329px",
      top: "-684px",
      transform: "scale(2.5)",
    });

    fireEvent.pointerLeave(zoomSurface);
    expect(
      screen.queryByTestId("design-preview-magnifier"),
    ).not.toBeInTheDocument();
  });

  it("background shorthand 이미지도 렌더된 위치 기준으로 확대한다", () => {
    act(() => {
      useDesignChatStore
        .getState()
        .setGeneratedImage(
          'url("https://example.com/generated.webp") center/cover no-repeat',
          [],
        );
    });

    render(<TieCanvas enableMagnifier />);

    const zoomSurface = screen.getByTestId("design-preview-zoom-surface");
    vi.spyOn(zoomSurface, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 316,
      height: 600,
      right: 326,
      bottom: 620,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(zoomSurface, {
      clientX: 168,
      clientY: 320,
      pointerType: "mouse",
    });

    expect(screen.getByTestId("design-preview-magnified-content")).toHaveStyle({
      left: "-329px",
      top: "-684px",
      transform: "scale(2.5)",
    });
  });
});
