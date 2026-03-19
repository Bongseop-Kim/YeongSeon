import { useMutation } from "@tanstack/react-query";
import { createSampleOrder } from "@/features/sample-order/api/sample-order-api";
import type { CreateSampleOrderRequest } from "@/features/sample-order/types/sample-order-input";
import { useAuthStore } from "@/store/auth";

export const useCreateSampleOrder = () => {
  return useMutation({
    mutationFn: (request: CreateSampleOrderRequest) => {
      const { user } = useAuthStore.getState();
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return createSampleOrder(request);
    },
    onError: (error) => {
      console.error("샘플 주문 생성 실패:", error);
    },
  });
};
