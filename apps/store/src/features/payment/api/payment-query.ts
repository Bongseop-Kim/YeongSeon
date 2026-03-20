import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmPayment } from "@/features/payment/api/payment-api";
import type {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
} from "@/features/payment/api/payment-api";
import { cartKeys } from "@/features/cart/api/cart-keys";
import { useAuthStore } from "@/store/auth";

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation<ConfirmPaymentResponse, Error, ConfirmPaymentRequest>({
    mutationFn: confirmPayment,
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: cartKeys.items(user.id) });
      }
    },
  });
};
