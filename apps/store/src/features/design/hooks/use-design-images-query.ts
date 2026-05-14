import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { getDesignImages } from "@/entities/design";

type DesignImagesQueryResult = Awaited<ReturnType<typeof getDesignImages>>;
interface DesignImagesQueryOptions {
  enabled?: boolean;
}

export function useDesignImagesQuery(
  pageSize = 12,
  options?: DesignImagesQueryOptions,
) {
  return useInfiniteQuery<
    DesignImagesQueryResult,
    Error,
    InfiniteData<DesignImagesQueryResult, number>,
    readonly unknown[],
    number
  >({
    queryKey: ["design-images", pageSize],
    queryFn: ({ pageParam }) => getDesignImages(pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (sum, page) => sum + page.images.length,
        0,
      );

      return loadedCount < lastPage.total ? allPages.length + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}
