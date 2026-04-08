import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDesignImages } from "@/entities/design";

export function useDesignImagesQuery(page: number, pageSize = 12) {
  return useQuery({
    queryKey: ["design-images", page, pageSize],
    queryFn: () => getDesignImages(page, pageSize),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
