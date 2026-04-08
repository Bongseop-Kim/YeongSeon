import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DesignImagePicker } from "@/features/design/components/design-image-picker";

const { useDesignImagesQuery } = vi.hoisted(() => ({
  useDesignImagesQuery: vi.fn(),
}));

vi.mock("@/features/design/hooks/use-design-images-query", () => ({
  useDesignImagesQuery,
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
  it("아코디언이 닫혀 있을 때 트리거 버튼만 보인다", () => {
    useDesignImagesQuery.mockReturnValue({
      data: { images: mockImages, total: 2 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /추가/ }),
    ).not.toBeInTheDocument();
  });

  it("트리거를 클릭하면 이미지 그리드가 펼쳐진다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { images: mockImages, total: 2 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    expect(screen.getByRole("button", { name: /추가/ })).toBeInTheDocument();
  });

  it("이미지 선택 후 추가 버튼 클릭 시 onAdd가 호출된다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { images: mockImages, total: 2 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const onAdd = vi.fn();
    render(<DesignImagePicker onAdd={onAdd} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    await userEvent.click(screen.getByRole("button", { name: "파란 넥타이" }));

    await userEvent.click(screen.getByRole("button", { name: /1장 추가/ }));

    expect(onAdd).toHaveBeenCalledWith([
      {
        url: "https://cdn.example.com/img1.png",
        fileId: "file-1",
        name: expect.stringContaining("AI 디자인"),
      },
    ]);
  });

  it("이미지가 없을 때 빈 상태를 표시한다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { images: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    expect(screen.getByText("아직 생성한 이미지가 없어요")).toBeInTheDocument();
  });

  it("취소 버튼 클릭 시 아코디언이 닫히고 선택이 초기화된다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { images: mockImages, total: 2 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const onAdd = vi.fn();
    render(<DesignImagePicker onAdd={onAdd} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    await userEvent.click(screen.getByRole("button", { name: "파란 넥타이" }));

    await userEvent.click(screen.getByRole("button", { name: /취소/ }));

    expect(
      screen.queryByRole("button", { name: /추가/ }),
    ).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("썸네일 이미지는 lazy loading과 async decoding을 사용한다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { images: mockImages, total: 2 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    const image = screen.getByAltText("파란 넥타이");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
  });

  it("페이지 버튼은 현재 페이지 주변 범위만 렌더링한다", async () => {
    useDesignImagesQuery.mockReturnValue({
      data: { images: mockImages, total: 120 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DesignImagePicker onAdd={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /내 AI 디자인에서 선택/ }),
    );

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "6" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });
});
