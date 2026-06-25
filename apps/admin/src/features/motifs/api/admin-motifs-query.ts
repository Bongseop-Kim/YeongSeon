import { useQuery } from "@tanstack/react-query";
import { getAdminMotifs } from "@/features/motifs/api/admin-motifs-api";
import { ADMIN_MOTIF_PAGE_SIZE } from "@/features/motifs/constants";
import type {
  AdminMotifItem,
  MotifSourceFilter,
} from "@/features/motifs/types/admin-motif";

export function useAdminMotifsQuery(params: {
  page: number;
  source?: MotifSourceFilter | null;
  idSearch?: string | null;
}): {
  data: AdminMotifItem[] | undefined;
  hasMore: boolean;
  isLoading: boolean;
  errorMessage: string | null;
} {
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const query = useQuery({
    queryKey: [
      "admin-motifs",
      page,
      params.source ?? null,
      params.idSearch ?? null,
    ],
    queryFn: () =>
      getAdminMotifs({
        source: params.source ?? null,
        idSearch: params.idSearch ?? null,
        limit: ADMIN_MOTIF_PAGE_SIZE + 1,
        offset: (page - 1) * ADMIN_MOTIF_PAGE_SIZE,
      }),
  });

  const rawData = query.data;
  return {
    data: rawData?.slice(0, ADMIN_MOTIF_PAGE_SIZE),
    hasMore: (rawData?.length ?? 0) > ADMIN_MOTIF_PAGE_SIZE,
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
