import { describe, expect, it, vi } from "vitest";
import { useDesignImagesQuery } from "@/features/design/hooks/use-design-images-query";

const { useInfiniteQuery } = vi.hoisted(() => ({
  useInfiniteQuery: vi.fn(),
}));

const { getDesignImages } = vi.hoisted(() => ({
  getDesignImages: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");

  return {
    ...actual,
    useInfiniteQuery,
  };
});

vi.mock("@/entities/design", () => ({
  getDesignImages,
}));

describe("useDesignImagesQuery", () => {
  it("전달된 query options를 useInfiniteQuery에 그대로 전달한다", () => {
    useInfiniteQuery.mockReturnValue({ data: undefined });

    useDesignImagesQuery(24, { enabled: false });

    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["design-images", 24],
        staleTime: 2 * 60 * 1000,
        enabled: false,
        initialPageParam: 1,
      }),
    );
  });

  it("queryFn은 pageParam과 pageSize로 getDesignImages를 호출한다", async () => {
    useInfiniteQuery.mockReturnValue({ data: undefined });

    useDesignImagesQuery(6);

    const [{ queryFn }] = useInfiniteQuery.mock.calls[0];
    await queryFn({ pageParam: 3 });

    expect(getDesignImages).toHaveBeenCalledWith(3, 6);
  });

  it("누적 이미지 수가 total보다 작으면 다음 페이지 번호를 반환한다", () => {
    useInfiniteQuery.mockReturnValue({ data: undefined });

    useDesignImagesQuery(2);

    const [{ getNextPageParam }] = useInfiniteQuery.mock.calls[0];
    const nextPage = getNextPageParam(
      { images: [{ imageUrl: "2", imageFileId: null }], total: 3 },
      [
        { images: [{ imageUrl: "1", imageFileId: null }], total: 3 },
        { images: [{ imageUrl: "2", imageFileId: null }], total: 3 },
      ],
    );

    expect(nextPage).toBe(3);
  });

  it("누적 이미지 수가 total 이상이면 다음 페이지를 요청하지 않는다", () => {
    useInfiniteQuery.mockReturnValue({ data: undefined });

    useDesignImagesQuery(2);

    const [{ getNextPageParam }] = useInfiniteQuery.mock.calls[0];
    const nextPage = getNextPageParam(
      { images: [{ imageUrl: "2", imageFileId: null }], total: 2 },
      [
        { images: [{ imageUrl: "1", imageFileId: null }], total: 2 },
        { images: [{ imageUrl: "2", imageFileId: null }], total: 2 },
      ],
    );

    expect(nextPage).toBeUndefined();
  });
});
