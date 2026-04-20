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

  it("CI 이미지 업로드는 ci attachment와 ciImage 컨텍스트를 설정한다", () => {
    const { container } = render(<AttachmentPopup onClose={onClose} />);
    const file = new File(["ci"], "ci.png", { type: "image/png" });
    const imageInput = container.querySelector('input[type="file"]');

    if (!(imageInput instanceof HTMLInputElement)) {
      throw new Error("image input not found");
    }

    fireEvent.click(screen.getByRole("button", { name: "CI 이미지 첨부" }));
    fireEvent.change(imageInput, {
      target: { files: [file] },
    });

    expect(addAttachment).toHaveBeenCalledWith({
      type: "image",
      label: "CI 이미지",
      value: "ci",
      file,
    });
    expect(setDesignContext).toHaveBeenCalledWith({
      ciImage: file,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("참고 이미지 업로드는 기존 CI attachment를 제거하지 않는다", () => {
    state.pendingAttachments = [
      {
        type: "image",
        label: "CI 이미지",
        value: "ci",
        file: new File(["ci"], "ci.png", { type: "image/png" }),
      },
    ];

    const { container } = render(<AttachmentPopup onClose={onClose} />);
    const file = new File(["ref"], "reference.png", { type: "image/png" });
    const imageInput = container.querySelector('input[type="file"]');

    if (!(imageInput instanceof HTMLInputElement)) {
      throw new Error("image input not found");
    }

    fireEvent.click(screen.getByRole("button", { name: "참고 이미지 첨부" }));
    fireEvent.change(imageInput, {
      target: { files: [file] },
    });

    expect(removeAttachment).not.toHaveBeenCalled();
    expect(addAttachment).toHaveBeenCalledWith({
      type: "image",
      label: "참고 이미지",
      value: "reference",
      file,
    });
    expect(setDesignContext).toHaveBeenCalledWith({
      referenceImage: file,
    });
  });
});
