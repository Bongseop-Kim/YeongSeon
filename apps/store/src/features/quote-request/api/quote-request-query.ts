import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createQuoteRequest,
  type CreateQuoteRequestRequest,
  getQuoteRequest,
  getQuoteRequests,
} from "@/features/quote-request/api/quote-request-api";
import { useAuthStore } from "@/shared/store/auth";
import { useRequiredUser } from "@/shared/hooks/use-required-user";

const quoteRequestKeys = {
  all: ["quote-requests"] as const,
  list: (userId?: string) => [...quoteRequestKeys.all, "list", userId] as const,
  detail: (id?: string) => [...quoteRequestKeys.all, "detail", id] as const,
};

export const useQuoteRequests = () => {
  const userId = useRequiredUser();

  return useQuery({
    queryKey: quoteRequestKeys.list(userId),
    queryFn: () => getQuoteRequests(),
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

export const useQuoteRequest = (id?: string) => {
  useRequiredUser();

  return useQuery({
    queryKey: quoteRequestKeys.detail(id),
    queryFn: () => {
      if (!id) {
        throw new Error("견적 요청 ID가 필요합니다.");
      }
      return getQuoteRequest(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
