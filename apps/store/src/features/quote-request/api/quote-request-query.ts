import { useMutation } from "@tanstack/react-query";
import {
  createQuoteRequest,
  type CreateQuoteRequestRequest,
} from "@/features/quote-request/api/quote-request-api";
import { useAuthStore } from "@/store/auth";

export const useCreateQuoteRequest = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (request: CreateQuoteRequestRequest) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return createQuoteRequest(request);
    },
    onError: (error) => {
      console.error("견적요청 생성 실패:", error);
    },
  });
};
