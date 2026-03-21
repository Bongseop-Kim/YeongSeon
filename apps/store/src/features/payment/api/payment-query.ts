import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmPayment } from "@/features/payment/api/payment-api";
import type {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
} from "@/features/payment/api/payment-api";
import { cartKeys } from "@/features/cart/api/cart-keys";
import { useRequiredUser } from "@/hooks/use-required-user";

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  const userId = useRequiredUser();

  return useMutation<ConfirmPaymentResponse, Error, ConfirmPaymentRequest>({
    mutationFn: confirmPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.items(userId) });
    },
  });
};
