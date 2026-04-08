import { describe, expect, it, vi } from "vitest";
import { useDesignImagesQuery } from "@/features/design/hooks/use-design-images-query";

const { useQuery } = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

const { getDesignImages } = vi.hoisted(() => ({
  getDesignImages: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");

  return {
    ...actual,
    useQuery,
  };
});

vi.mock("@/entities/design", () => ({
  getDesignImages,
}));

describe("useDesignImagesQuery", () => {
  it("전달된 query options를 useQuery에 그대로 전달한다", () => {
    useQuery.mockReturnValue({ data: undefined });

    useDesignImagesQuery(2, 24, { enabled: false });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["design-images", 2, 24],
        staleTime: 2 * 60 * 1000,
        enabled: false,
      }),
    );
  });

  it("queryFn은 현재 page와 pageSize로 getDesignImages를 호출한다", async () => {
    useQuery.mockReturnValue({ data: undefined });

    useDesignImagesQuery(3, 6);

    const [{ queryFn }] = useQuery.mock.calls[0];
    await queryFn();

    expect(getDesignImages).toHaveBeenCalledWith(3, 6);
  });
});
