import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  requestEmailChangeCode,
  resendEmailChangeCode,
  verifyEmailChangeCode,
} from "@/features/my-page/api/email-api";
import { profileKeys } from "@/features/my-page/api/profile-query";
import { authKeys } from "@/features/auth/api/auth.query";

export const useRequestEmailChangeCode = () => {
  return useMutation({
    mutationFn: (email: string) => requestEmailChangeCode(email),
  });
};

export const useResendEmailChangeCode = () => {
  return useMutation({
    mutationFn: (email: string) => resendEmailChangeCode(email),
  });
};

export const useVerifyEmailChangeCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyEmailChangeCode(email, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
};
