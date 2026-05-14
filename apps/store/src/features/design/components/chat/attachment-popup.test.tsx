import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentPopup } from "@/features/design/components/chat/attachment-popup";

const { addAttachment, removeAttachment, setDesignContext, onClose, state } =
  vi.hoisted(() => ({
    addAttachment: vi.fn(),
    removeAttachment: vi.fn(),
    setDesignContext: vi.fn(),
    onClose: vi.fn(),
    state: {
      designContext: {
        colors: [] as string[],
        pattern: null,
        fabricMethod: "yarn-dyed" as const,
        imageCount: 4 as 1 | 2 | 3 | 4,
        sourceImage: null,
        onePointOffsetX: 0,
        onePointOffsetY: 0,
        ciImage: null,
        ciPlacement: null,
        referenceImage: null,
      },
      pendingAttachments: [] as Array<{
        type:
          | "color"
          | "pattern"
          | "fabric"
          | "image"
          | "ci-placement"
          | "image-count";
        label: string;
        value: string;
        file?: File;
      }>,
    },
  }));

vi.mock("@/features/design/store/design-chat-store", () => ({
  useDesignChatStore: <T,>(
    selector: (input: {
      designContext: typeof state.designContext;
      pendingAttachments: typeof state.pendingAttachments;
      addAttachment: typeof addAttachment;
      removeAttachment: typeof removeAttachment;
      setDesignContext: typeof setDesignContext;
    }) => T,
  ) =>
    selector({
      designContext: state.designContext,
      pendingAttachments: state.pendingAttachments,
      addAttachment,
      removeAttachment,
      setDesignContext,
    }),
}));

describe("AttachmentPopup", () => {
  beforeEach(() => {
    addAttachment.mockReset();
    removeAttachment.mockReset();
    setDesignContext.mockReset();
    onClose.mockReset();
    state.pendingAttachments = [];
    state.designContext.colors = [];
    state.designContext.fabricMethod = "yarn-dyed";
    state.designContext.imageCount = 4;
  });

  it("색상은 한 개만 선택하며 새 색상 선택 시 기존 색상을 교체한다", () => {
    state.pendingAttachments = [
      {
        type: "color",
        label: "네이비",
        value: "#1a2c5b",
      },
    ];
    state.designContext.colors = ["#1a2c5b"];

    render(<AttachmentPopup onClose={onClose} />);

    const nextColorButton = screen
      .getAllByRole("button")
      .find(
        (button) =>
          button.getAttribute("aria-label") !== null &&
          button.getAttribute("aria-label") !== "네이비",
      );

    if (!nextColorButton) {
      throw new Error("next color button not found");
    }

    const nextColor = nextColorButton.getAttribute("aria-label");
    fireEvent.click(nextColorButton);

    expect(removeAttachment).toHaveBeenCalledWith(0);
    expect(addAttachment).toHaveBeenCalledWith({
      type: "color",
      label: nextColor,
      value: expect.any(String),
    });
    expect(setDesignContext).toHaveBeenCalledWith({
      colors: [expect.any(String)],
    });
  });

  it("이미지 업로드 버튼은 첨부 옵션 내부에 렌더링하지 않는다", () => {
    state.pendingAttachments = [
      {
        type: "image",
        label: "이미지 첨부",
        value: "source",
        file: new File(["ci"], "ci.png", { type: "image/png" }),
      },
    ];

    const { container } = render(<AttachmentPopup onClose={onClose} />);

    expect(
      screen.queryByRole("button", { name: "이미지 첨부" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("원단 방식과 생성 수량을 첨부 옵션 내부에서 변경한다", () => {
    render(<AttachmentPopup onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "날염 (프린팅)" }));
    fireEvent.click(screen.getByRole("button", { name: "2개" }));

    expect(setDesignContext).toHaveBeenCalledWith({ fabricMethod: "print" });
    expect(setDesignContext).toHaveBeenCalledWith({ imageCount: 2 });
  });
});
