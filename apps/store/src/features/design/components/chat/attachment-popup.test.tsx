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
        colors: [],
        pattern: null,
        fabricMethod: "yarn-dyed" as const,
        sourceImage: null,
        onePointOffsetX: 0,
        onePointOffsetY: 0,
        ciImage: null,
        ciPlacement: null,
        referenceImage: null,
      },
      pendingAttachments: [] as Array<{
        type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
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
  });

  it("이미지 업로드는 단일 source attachment와 sourceImage 컨텍스트를 설정한다", () => {
    const { container } = render(<AttachmentPopup onClose={onClose} />);
    const file = new File(["ci"], "ci.png", { type: "image/png" });
    const imageInput = container.querySelector('input[type="file"]');

    if (!(imageInput instanceof HTMLInputElement)) {
      throw new Error("image input not found");
    }

    fireEvent.click(screen.getByRole("button", { name: "이미지 첨부" }));
    fireEvent.change(imageInput, {
      target: { files: [file] },
    });

    expect(addAttachment).toHaveBeenCalledWith({
      type: "image",
      label: "이미지 첨부",
      value: "source",
      file,
    });
    expect(setDesignContext).toHaveBeenCalledWith({
      sourceImage: file,
      onePointOffsetX: 0,
      onePointOffsetY: 0,
      ciImage: null,
      referenceImage: null,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("파일 선택 change가 리렌더 전 동기로 발생해도 단일 source 이미지를 사용한다", () => {
    const { container } = render(<AttachmentPopup onClose={onClose} />);
    const file = new File(["ci"], "ci-sync.png", { type: "image/png" });
    const imageInput = container.querySelector('input[type="file"]');

    if (!(imageInput instanceof HTMLInputElement)) {
      throw new Error("image input not found");
    }

    imageInput.click = () => {
      fireEvent.change(imageInput, {
        target: { files: [file] },
      });
    };

    fireEvent.click(screen.getByRole("button", { name: "이미지 첨부" }));

    expect(addAttachment).toHaveBeenCalledWith({
      type: "image",
      label: "이미지 첨부",
      value: "source",
      file,
    });
    expect(setDesignContext).toHaveBeenCalledWith({
      sourceImage: file,
      onePointOffsetX: 0,
      onePointOffsetY: 0,
      ciImage: null,
      referenceImage: null,
    });
  });

  it("이미지 재업로드는 기존 image attachment를 교체한다", () => {
    state.pendingAttachments = [
      {
        type: "image",
        label: "이미지 첨부",
        value: "source",
        file: new File(["ci"], "ci.png", { type: "image/png" }),
      },
    ];

    const { container } = render(<AttachmentPopup onClose={onClose} />);
    const file = new File(["ref"], "source.png", { type: "image/png" });
    const imageInput = container.querySelector('input[type="file"]');

    if (!(imageInput instanceof HTMLInputElement)) {
      throw new Error("image input not found");
    }

    fireEvent.click(screen.getByRole("button", { name: "이미지 첨부" }));
    fireEvent.change(imageInput, {
      target: { files: [file] },
    });

    expect(removeAttachment).toHaveBeenCalledWith(0);
    expect(addAttachment).toHaveBeenCalledWith({
      type: "image",
      label: "이미지 첨부",
      value: "source",
      file,
    });
    expect(setDesignContext).toHaveBeenCalledWith({
      sourceImage: file,
      onePointOffsetX: 0,
      onePointOffsetY: 0,
      ciImage: null,
      referenceImage: null,
    });
  });
});
