import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmPayment } from "@/entities/payment";
import type {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
} from "@/entities/payment";
import { cartKeys } from "@/entities/cart";
import { useRequiredUser } from "@/shared/hooks/use-required-user";

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
