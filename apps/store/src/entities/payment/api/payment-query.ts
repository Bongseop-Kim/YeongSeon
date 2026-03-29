import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmPayment } from "@/entities/payment/api/payment-api";
import type {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
} from "@/entities/payment/api/payment-api";
import { useRequiredUser } from "@/shared/hooks/use-required-user";

const cartItemsQueryKey = (userId: string) =>
  ["cart", userId, "items"] as const;

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  const userId = useRequiredUser();

  return useMutation<ConfirmPaymentResponse, Error, ConfirmPaymentRequest>({
    mutationFn: confirmPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartItemsQueryKey(userId) });
    },
  });
};
