import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShippingAddresses,
  deleteShippingAddress,
} from "@/features/shipping/api/shipping-api";
import { toast } from "@/shared/lib/toast";
import { useAuthStore } from "@/shared/store/auth";

/**
 * 배송지 쿼리 키
 */
const shippingKeys = {
  all: ["shipping"] as const,
  list: () => [...shippingKeys.all, "list"] as const,
  details: () => [...shippingKeys.all, "detail"] as const,
  detail: (id: string) => [...shippingKeys.details(), id] as const,
  default: () => [...shippingKeys.all, "default"] as const,
};

/**
 * 현재 사용자의 모든 배송지 조회 쿼리
 */
export const useShippingAddresses = () => {
  const { user, initialized } = useAuthStore();

  return useQuery({
    queryKey: shippingKeys.list(),
    queryFn: getShippingAddresses,
    enabled: initialized && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};

/**
 * 배송지 삭제 뮤테이션
 */
export const useDeleteShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteShippingAddress,
    onSuccess: () => {
      // 배송지 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: shippingKeys.list() });
      queryClient.invalidateQueries({ queryKey: shippingKeys.default() });
      toast.success("배송지가 삭제되었습니다.");
    },
    onError: (error) => {
      console.error("Shipping address deletion error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "배송지 삭제에 실패했습니다. 다시 시도해주세요.";
      toast.error(errorMessage);
    },
  });
};
