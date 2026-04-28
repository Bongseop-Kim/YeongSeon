import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatInput } from "@/features/design/components/chat/chat-input";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

describe("ChatInput", () => {
  let createdCreateObjectUrl = false;
  let createdRevokeObjectUrl = false;

  beforeEach(() => {
    useDesignChatStore.getState().resetConversation();
    if (!("createObjectURL" in URL)) {
      createdCreateObjectUrl = true;
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: () => "",
      });
    }
    if (!("revokeObjectURL" in URL)) {
      createdRevokeObjectUrl = true;
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: () => undefined,
      });
    }
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    if (createdCreateObjectUrl) {
      delete (URL as Partial<typeof URL>).createObjectURL;
      createdCreateObjectUrl = false;
    }
    if (createdRevokeObjectUrl) {
      delete (URL as Partial<typeof URL>).revokeObjectURL;
      createdRevokeObjectUrl = false;
    }
  });

  it("첨부한 이미지를 입력 박스 안에서 프리뷰로 보여준다", () => {
    const file = new File(["image"], "crest.png", { type: "image/png" });
    useDesignChatStore.getState().addAttachment({
      type: "image",
      label: "이미지 첨부",
      value: "source",
      file,
    });

    render(<ChatInput onSend={vi.fn()} />);

    const preview = screen.getByRole("img", { name: "crest.png 프리뷰" });

    expect(preview).toHaveAttribute("src", "blob:preview");
    expect(screen.getByText("crest.png")).toBeInTheDocument();
  });

  it("여러 이미지를 입력 박스 상단 프리뷰로 보여주고 하단 칩에는 반복하지 않는다", () => {
    const firstFile = new File(["first"], "crest.png", { type: "image/png" });
    const secondFile = new File(["second"], "pattern.png", {
      type: "image/png",
    });
    useDesignChatStore.setState({
      pendingAttachments: [
        {
          type: "image",
          label: "이미지 첨부",
          value: "source-1",
          file: firstFile,
        },
        {
          type: "image",
          label: "이미지 첨부",
          value: "source-2",
          file: secondFile,
        },
      ],
    });

    render(<ChatInput onSend={vi.fn()} />);

    expect(
      screen.getByRole("img", { name: "crest.png 프리뷰" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "pattern.png 프리뷰" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("chat-input-option-row")).queryByText(
        "이미지 첨부",
      ),
    ).not.toBeInTheDocument();
  });

  it("선택한 옵션 칩을 추가 버튼 옆 액션 행에 보여준다", () => {
    useDesignChatStore.getState().addAttachment({
      type: "color",
      label: "네이비",
      value: "#001f3f",
    });

    render(<ChatInput onSend={vi.fn()} />);

    const optionRow = screen.getByTestId("chat-input-option-row");

    expect(
      within(optionRow).getByRole("button", { name: "옵션 추가" }),
    ).toBeInTheDocument();
    expect(within(optionRow).getByText("네이비")).toBeInTheDocument();
  });

  it("이미지 프리뷰 제거 버튼은 남은 첫 이미지를 이미지 컨텍스트로 유지한다", () => {
    const firstFile = new File(["first"], "crest.png", { type: "image/png" });
    const secondFile = new File(["second"], "pattern.png", {
      type: "image/png",
    });
    useDesignChatStore.setState({
      designContext: {
        ...useDesignChatStore.getState().designContext,
        sourceImage: firstFile,
      },
      pendingAttachments: [
        {
          type: "image",
          label: "이미지 첨부",
          value: "source-1",
          file: firstFile,
        },
        {
          type: "image",
          label: "이미지 첨부",
          value: "source-2",
          file: secondFile,
        },
      ],
    });

    render(<ChatInput onSend={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "crest.png 제거" }));

    expect(useDesignChatStore.getState().pendingAttachments).toEqual([
      expect.objectContaining({ file: secondFile }),
    ]);
    expect(useDesignChatStore.getState().designContext.sourceImage).toBe(
      secondFile,
    );
  });
});
