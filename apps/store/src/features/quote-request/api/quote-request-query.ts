import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createQuoteRequest,
  type CreateQuoteRequestRequest,
  getQuoteRequests,
} from "@/features/quote-request/api/quote-request-api";
import { useAuthStore } from "@/store/auth";

export const quoteRequestKeys = {
  all: ["quote-requests"] as const,
  list: (userId?: string) => [...quoteRequestKeys.all, "list", userId] as const,
};

export const useQuoteRequests = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: quoteRequestKeys.list(user?.id),
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getQuoteRequests();
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

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
