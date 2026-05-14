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

const { navigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

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
    navigate.mockReset();
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

  it("선택한 옵션 칩을 입력 영역 아래 별도 행에 보여준다", () => {
    useDesignChatStore.getState().addAttachment({
      type: "color",
      label: "네이비",
      value: "#001f3f",
    });

    render(<ChatInput onSend={vi.fn()} />);

    const optionRow = screen.getByTestId("chat-input-option-row");
    const selectedOptionRow = screen.getByTestId(
      "chat-input-selected-option-row",
    );

    expect(
      within(optionRow).getByRole("button", { name: "옵션 추가" }),
    ).toBeInTheDocument();
    expect(
      within(optionRow).getByRole("button", { name: "이미지 첨부" }),
    ).toBeInTheDocument();
    expect(
      within(optionRow)
        .getAllByRole("button")
        .slice(0, 2)
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["이미지 첨부", "옵션 추가"]);
    expect(within(optionRow).queryByText("네이비")).not.toBeInTheDocument();
    expect(within(selectedOptionRow).getByText("네이비")).toBeInTheDocument();
  });

  it("선택한 원단 방식과 생성 수량을 액션 행에 작게 표시한다", () => {
    useDesignChatStore.getState().setDesignContext({
      fabricMethod: "print",
      imageCount: 2,
    });

    render(<ChatInput onSend={vi.fn()} />);

    expect(
      within(screen.getByTestId("chat-input-selected-option-row")).getByText(
        "날염 (프린팅) · 2개",
      ),
    ).toBeInTheDocument();
  });

  it("토큰 잔액과 텍스트 충전 버튼을 입력 박스 우측 상단에 표시한다", () => {
    render(<ChatInput onSend={vi.fn()} tokenBalance={121} />);

    expect(screen.getByText("121")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "충전" }));

    expect(navigate).toHaveBeenCalledWith("/token/purchase");
  });

  it("이미지 첨부 버튼은 선택한 이미지들을 attachment로 추가하고 첫 이미지를 sourceImage 컨텍스트로 설정한다", () => {
    const { container } = render(<ChatInput onSend={vi.fn()} />);
    const firstFile = new File(["ci"], "ci.png", { type: "image/png" });
    const secondFile = new File(["ref"], "ref.png", { type: "image/png" });
    const imageInput = container.querySelector('input[type="file"]');

    if (!(imageInput instanceof HTMLInputElement)) {
      throw new Error("image input not found");
    }

    fireEvent.click(screen.getByRole("button", { name: "이미지 첨부" }));
    fireEvent.change(imageInput, {
      target: { files: [firstFile, secondFile] },
    });

    expect(useDesignChatStore.getState().pendingAttachments).toEqual([
      expect.objectContaining({
        type: "image",
        label: "이미지 첨부",
        value: expect.stringMatching(/^source-/),
        file: firstFile,
      }),
      expect.objectContaining({
        type: "image",
        label: "이미지 첨부",
        value: expect.stringMatching(/^source-/),
        file: secondFile,
      }),
    ]);
    expect(useDesignChatStore.getState().designContext.sourceImage).toBe(
      firstFile,
    );
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
