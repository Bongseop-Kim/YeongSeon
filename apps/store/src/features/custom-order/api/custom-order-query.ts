import { useMutation } from "@tanstack/react-query";
import {
  createCustomOrder,
  type CreateCustomOrderRequest,
} from "@/features/custom-order/api/custom-order-api";
import { useRequiredUser } from "@/hooks/use-required-user";

export const useCreateCustomOrder = () => {
  useRequiredUser();

  return useMutation({
    mutationFn: (request: CreateCustomOrderRequest) =>
      createCustomOrder(request),
    onError: (error) => {
      console.error("주문제작 생성 실패:", error);
    },
  });
};
