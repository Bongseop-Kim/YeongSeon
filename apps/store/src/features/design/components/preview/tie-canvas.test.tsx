import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
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
});
