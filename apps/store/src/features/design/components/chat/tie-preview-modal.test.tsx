import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TiePreviewModal } from "@/features/design/components/chat/tie-preview-modal";

describe("TiePreviewModal", () => {
  it("렌더링 시 넥타이 그림자 이미지가 올바른 경로로 표시된다", () => {
    const { container } = render(
      <TiePreviewModal
        imageUrl="linear-gradient(to bottom, red, blue)"
        onClose={vi.fn()}
      />,
    );
    const shadow = container.querySelector("img");
    expect(shadow).toBeInTheDocument();
    expect(shadow).toHaveAttribute("src", "/images/tieShadow.png");
  });

  it("배경을 클릭하면 onClose가 호출된다", async () => {
    const onClose = vi.fn();
    render(
      <TiePreviewModal
        imageUrl="linear-gradient(to bottom, red, blue)"
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByTestId("tie-preview-overlay"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("넥타이 컨테이너 클릭은 onClose를 호출하지 않는다", async () => {
    const onClose = vi.fn();
    render(
      <TiePreviewModal
        imageUrl="linear-gradient(to bottom, red, blue)"
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByTestId("tie-preview-container"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
