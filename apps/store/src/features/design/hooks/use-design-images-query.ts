import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { getDesignImages } from "@/entities/design";

type DesignImagesQueryResult = Awaited<ReturnType<typeof getDesignImages>>;
type DesignImagesQueryOptions = Omit<
  UseQueryOptions<DesignImagesQueryResult>,
  "queryKey" | "queryFn" | "placeholderData"
>;

export function useDesignImagesQuery(
  page: number,
  pageSize = 12,
  options?: DesignImagesQueryOptions,
) {
  return useQuery({
    queryKey: ["design-images", page, pageSize],
    queryFn: () => getDesignImages(page, pageSize),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    ...options,
  });
}
