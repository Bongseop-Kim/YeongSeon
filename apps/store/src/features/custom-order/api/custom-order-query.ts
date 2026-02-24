import { useMutation } from "@tanstack/react-query";
import {
  createCustomOrder,
  type CreateCustomOrderRequest,
} from "@/features/custom-order/api/custom-order-api";
import { useAuthStore } from "@/store/auth";

export const useCreateCustomOrder = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (request: CreateCustomOrderRequest) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return createCustomOrder(request);
    },
    onError: (error) => {
      console.error("주문제작 생성 실패:", error);
    },
  });
};
