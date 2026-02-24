import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShippingAddresses,
  getDefaultShippingAddress,
  getShippingAddressById,
  createShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
} from "./shipping-api";
import type { UpdateShippingAddressData } from "@/features/shipping/types/shipping-address-record";
import { toast } from "@/lib/toast";

/**
 * 배송지 쿼리 키
 */
export const shippingKeys = {
  all: ["shipping"] as const,
  lists: () => [...shippingKeys.all, "list"] as const,
  list: () => [...shippingKeys.lists()] as const,
  details: () => [...shippingKeys.all, "detail"] as const,
  detail: (id: string) => [...shippingKeys.details(), id] as const,
  default: () => [...shippingKeys.all, "default"] as const,
};

/**
 * 현재 사용자의 모든 배송지 조회 쿼리
 */
export const useShippingAddresses = () => {
  return useQuery({
    queryKey: shippingKeys.list(),
    queryFn: getShippingAddresses,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};

/**
 * 기본 배송지 조회 쿼리
 */
export const useDefaultShippingAddress = () => {
  return useQuery({
    queryKey: shippingKeys.default(),
    queryFn: getDefaultShippingAddress,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};

/**
 * ID로 배송지 조회 쿼리
 */
export const useShippingAddress = (id: string) => {
  return useQuery({
    queryKey: shippingKeys.detail(id),
    queryFn: () => getShippingAddressById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};

/**
 * 배송지 생성 뮤테이션
 */
export const useCreateShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createShippingAddress,
    onSuccess: () => {
      // 배송지 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: shippingKeys.list() });
      queryClient.invalidateQueries({ queryKey: shippingKeys.default() });
      toast.success("배송지가 추가되었습니다.");
    },
    onError: (error) => {
      console.error("Shipping address creation error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "배송지 추가에 실패했습니다. 다시 시도해주세요.";
      toast.error(errorMessage);
    },
  });
};

/**
 * 배송지 업데이트 뮤테이션
 */
export const useUpdateShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateShippingAddressData;
    }) => updateShippingAddress(id, data),
    onSuccess: (_, variables) => {
      // 배송지 목록 및 상세 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: shippingKeys.list() });
      queryClient.invalidateQueries({ queryKey: shippingKeys.default() });
      queryClient.invalidateQueries({
        queryKey: shippingKeys.detail(variables.id),
      });
      toast.success("배송지가 수정되었습니다.");
    },
    onError: (error) => {
      console.error("Shipping address update error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "배송지 수정에 실패했습니다. 다시 시도해주세요.";
      toast.error(errorMessage);
    },
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
