import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClaims, createClaim } from "@/features/order/api/claims-api";
import type { CreateClaimRequest } from "@yeongseon/shared/types/view/claim-input";
import { useAuthStore } from "@/store/auth";
import type { ListFilters } from "@/features/order/api/list-filters";
import { orderKeys } from "@/features/order/api/order-query";

/**
 * 클레임 쿼리 키
 */
export const claimKeys = {
  all: ["claims"] as const,
  list: (userId?: string, filters?: ListFilters) =>
    [
      ...claimKeys.all,
      "list",
      userId,
      filters?.keyword ?? "",
      filters?.dateFrom ?? "",
      filters?.dateTo ?? "",
    ] as const,
};

/**
 * 클레임 목록 조회 쿼리
 */
export const useClaims = (filters?: ListFilters) => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: claimKeys.list(user?.id, filters),
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getClaims(filters);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 클레임 생성 뮤테이션
 */
export const useCreateClaim = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (request: CreateClaimRequest) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return createClaim(request);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: claimKeys.list(user.id) });
        queryClient.invalidateQueries({ queryKey: orderKeys.all });
      }
    },
    onError: (error) => {
      console.error("클레임 생성 실패:", error);
    },
  });
};
