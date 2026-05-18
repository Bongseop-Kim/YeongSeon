import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesignImagePicker } from "@/features/design/components/design-image-picker";

const { useDesignImagesQuery } = vi.hoisted(() => ({
  useDesignImagesQuery: vi.fn(),
}));

const { useBreakpoint } = vi.hoisted(() => ({
  useBreakpoint: vi.fn(),
}));

vi.mock("@/features/design/hooks/use-design-images-query", () => ({
  useDesignImagesQuery,
}));

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint,
}));

const mockImages = [
  {
    imageUrl: "https://cdn.example.com/img1.png",
    imageFileId: "file-1",
    createdAt: "2026-04-01T10:00:00Z",
    sessionFirstMessage: "파란 넥타이",
  },
  {
    imageUrl: "https://cdn.example.com/img2.png",
    imageFileId: "file-2",
    createdAt: "2026-04-02T10:00:00Z",
    sessionFirstMessage: "빨간 넥타이",
  },
];

describe("DesignImagePicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    useBreakpoint.mockReturnValue({ isMobile: false });
    useDesignImagesQuery.mockReturnValue({
      data: { images: mockImages, total: 2 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
  });

  it("닫혀 있을 때 배송지 변경 버튼과 같은 outline sm 트리거만 보인다", () => {
    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: mockImages, total: 2 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);

    expect(useDesignImagesQuery).toHaveBeenCalledWith(24, {
      enabled: false,
    });

    const trigger = screen.getByRole("button", {
      name: /내 AI 디자인에서 선택/,
    });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass("border", "h-8");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("PC에서 트리거를 클릭하면 필터 모달 스타일의 Dialog가 열린다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: mockImages, total: 2 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    expect(useDesignImagesQuery).toHaveBeenLastCalledWith(24, {
      enabled: true,
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "AI 디자인" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/장 중 .*장 선택/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "선택한 이미지 추가" }),
    ).toBeDisabled();
  });

  it("모바일에서는 필터 시트처럼 제목을 숨기고 CTA 여백을 맞춘다", async () => {
    useBreakpoint.mockReturnValue({ isMobile: true });
    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: mockImages, total: 2 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    const heading = screen.getByRole("heading", { name: "AI 디자인" });
    expect(heading.parentElement).toHaveClass("sr-only");

    const cta = screen.getByRole("button", { name: "선택한 이미지 추가" });
    expect(cta.parentElement?.parentElement).toHaveClass(
      "px-2",
      "pt-4",
      "pb-2",
    );
    expect(cta.parentElement?.parentElement).not.toHaveClass("p-5");
  });

  it("여러 이미지 선택 후 추가 버튼 클릭 시 onAdd가 호출된다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: mockImages, total: 2 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const onAdd = vi.fn();
    render(<DesignImagePicker onAdd={onAdd} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    await userEvent.click(screen.getByRole("button", { name: "파란 넥타이" }));
    await userEvent.click(screen.getByRole("button", { name: "빨간 넥타이" }));

    await userEvent.click(screen.getByRole("button", { name: /2장 추가/ }));

    expect(onAdd).toHaveBeenCalledWith([
      {
        url: "https://cdn.example.com/img1.png",
        fileId: "file-1",
        name: expect.stringContaining("AI 디자인"),
      },
      {
        url: "https://cdn.example.com/img2.png",
        fileId: "file-2",
        name: expect.stringContaining("AI 디자인"),
      },
    ]);
  });

  it("이미지가 없을 때 빈 상태를 표시한다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: [], total: 0 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    expect(screen.getByText("아직 생성한 이미지가 없어요")).toBeInTheDocument();
  });

  it("모달에는 취소 버튼을 표시하지 않는다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: mockImages, total: 2 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const onAdd = vi.fn();
    render(<DesignImagePicker onAdd={onAdd} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    expect(
      screen.queryByRole("button", { name: /취소/ }),
    ).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("썸네일 이미지는 lazy loading과 async decoding을 사용한다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: mockImages, total: 2 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    const image = screen.getByAltText("파란 넥타이");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(screen.queryByText("04. 01.")).not.toBeInTheDocument();
  });

  it("무한스크롤 sentinel이 보이면 다음 페이지를 요청한다", async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const fetchNextPage = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn((callback) => {
        callback([{ isIntersecting: true }]);
        return { observe, disconnect };
      }),
    );

    useDesignImagesQuery.mockReturnValue({
      data: { pages: [{ images: mockImages, total: 120 }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    await waitFor(() => expect(fetchNextPage).toHaveBeenCalled());
  });

  it("createdAt이 비정상이어도 날짜 대체 문구를 표시하지 않는다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: {
        pages: [
          {
            images: [
              {
                imageUrl: "https://cdn.example.com/img3.png",
                imageFileId: "file-3",
                createdAt: "not-a-date",
                sessionFirstMessage: "검은 넥타이",
              },
            ],
            total: 1,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const onAdd = vi.fn();
    render(<DesignImagePicker onAdd={onAdd} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    expect(screen.queryByText("unknown date")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "검은 넥타이" }));
    await userEvent.click(screen.getByRole("button", { name: /1장 추가/ }));

    expect(onAdd).toHaveBeenCalledWith([
      {
        url: "https://cdn.example.com/img3.png",
        fileId: "file-3",
        name: "AI 디자인",
      },
    ]);
  });
});
