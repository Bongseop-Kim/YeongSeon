import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type * as ReactRouterDom from "react-router-dom";
import { TiePreviewModal } from "@/features/design/components/chat/tie-preview-modal";
import { downloadTiePreviewImage } from "@/features/design/components/preview/download-tie-preview-image";

const navigate = vi.fn();

vi.mock(
  "@/features/design/components/preview/download-tie-preview-image",
  () => ({
    downloadTiePreviewImage: vi.fn().mockResolvedValue(undefined),
  }),
);

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("TiePreviewModal", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

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

  it("다운로드 버튼은 반복 타일 URL로 이미지를 생성한다", async () => {
    render(
      <TiePreviewModal
        imageUrl='url("https://example.com/repeat.webp") center/cover no-repeat'
        repeatTileUrl="https://example.com/repeat.webp"
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "이미지 다운로드" }),
    );

    expect(downloadTiePreviewImage).toHaveBeenCalledWith({
      imageUrl: 'url("https://example.com/repeat.webp") center/cover no-repeat',
      repeatTileUrl: "https://example.com/repeat.webp",
      unmasked: false,
      filename: "design-masked.png",
    });
  });

  it("하단 주문 제작하기 CTA를 누르면 주문 제작 페이지로 이동한다", async () => {
    const onClose = vi.fn();
    render(
      <TiePreviewModal
        imageUrl='url("https://example.com/repeat.webp") center/cover no-repeat'
        repeatTileUrl="https://example.com/repeat.webp"
        onClose={onClose}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "주문 제작하기" }),
    );

    expect(navigate).toHaveBeenCalledWith("/custom-order");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("두 손가락 핀치로 미리보기를 확대한다", () => {
    render(
      <TiePreviewModal
        imageUrl='url("https://example.com/repeat.webp") center/cover no-repeat'
        onClose={vi.fn()}
      />,
    );

    const container = screen.getByTestId("tie-preview-container");

    fireEvent.pointerDown(container, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerDown(container, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 140,
      clientY: 100,
    });
    fireEvent.pointerMove(container, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 220,
      clientY: 100,
    });

    expect(container).toHaveStyle({
      transform: "translate3d(0px, 0px, 0) scale(3)",
    });
  });

  it("확대 후 한 손가락 드래그로 미리보기를 이동한다", () => {
    render(
      <TiePreviewModal
        imageUrl='url("https://example.com/repeat.webp") center/cover no-repeat'
        onClose={vi.fn()}
      />,
    );

    const container = screen.getByTestId("tie-preview-container");

    fireEvent.pointerDown(container, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerDown(container, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 140,
      clientY: 100,
    });
    fireEvent.pointerMove(container, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 180,
      clientY: 100,
    });
    fireEvent.pointerUp(container, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 180,
      clientY: 100,
    });
    fireEvent.pointerMove(container, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 130,
      clientY: 120,
    });

    expect(container).toHaveStyle({
      transform: "translate3d(30px, 20px, 0) scale(2)",
    });
  });

  it("마스크 표시 방식을 바꾸면 확대 상태를 초기화한다", async () => {
    render(
      <TiePreviewModal
        imageUrl='url("https://example.com/repeat.webp") center/cover no-repeat'
        onClose={vi.fn()}
      />,
    );

    const container = screen.getByTestId("tie-preview-container");

    fireEvent.pointerDown(container, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerDown(container, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 140,
      clientY: 100,
    });
    fireEvent.pointerMove(container, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 180,
      clientY: 100,
    });

    await userEvent.click(
      screen.getByRole("button", { name: "패턴 전체 보기" }),
    );

    expect(container).toHaveStyle({
      transform: "translate3d(0px, 0px, 0) scale(1)",
    });
  });
});
