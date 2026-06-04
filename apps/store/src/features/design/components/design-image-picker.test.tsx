import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesignImagePicker } from "@/features/design/components/design-image-picker";

const { useDesignImagesQuery } = vi.hoisted(() => ({
  useDesignImagesQuery: vi.fn(),
}));

const { navigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const modalConfirm = vi.hoisted(() => vi.fn());

const authState = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
}));

vi.mock("@/features/design/hooks/use-design-images-query", () => ({
  useDesignImagesQuery,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: () => ({ user: authState.user }),
}));

vi.mock("@/shared/store/modal", () => ({
  useModalStore: (
    selector?: (state: { confirm: typeof modalConfirm }) => unknown,
  ) => {
    const state = { confirm: modalConfirm };
    return selector ? selector(state) : state;
  },
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
    authState.user = { id: "user-1" };
    navigate.mockReset();
    modalConfirm.mockReset();
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

  it("비로그인 상태에서 트리거를 클릭하면 Dialog 대신 로그인 확인창을 띄운다", async () => {
    authState.user = null;
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

    expect(modalConfirm).toHaveBeenCalled();
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

  it("공통 선택 Dialog 패턴으로 제목과 취소/선택 CTA를 표시한다", async () => {
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
    expect(heading.parentElement).toHaveClass("border-b", "p-5");

    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: "선택한 이미지 추가" });
    expect(cta.parentElement).toHaveClass("border-t", "p-5");
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

  it("취소 버튼은 선택을 버리고 모달을 닫는다", async () => {
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

    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
