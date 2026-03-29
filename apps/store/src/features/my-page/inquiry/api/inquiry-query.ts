import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  searchProductsForInquiry,
} from "./inquiry-api";
import type { InquiryCategory } from "@/features/my-page/inquiry/types/inquiry-item";
import { useAuthStore } from "@/shared/store/auth";
import { useRequiredUser } from "@/shared/hooks/use-required-user";

const inquiryKeys = {
  all: ["inquiries"] as const,
  list: (userId?: string) => [...inquiryKeys.all, "list", userId] as const,
  productSearch: (query: string) => ["inquiry-product-search", query] as const,
};

export const useInquiries = () => {
  const userId = useRequiredUser();
  return useQuery({
    queryKey: inquiryKeys.list(userId),
    queryFn: () => getInquiries(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (params: {
      category: InquiryCategory;
      productId?: number;
      title: string;
      content: string;
    }) => {
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return createInquiry({ userId: user.id, ...params });
    },
    onSuccess: () => {
      if (user?.id)
        queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
    },
  });
};

export const useUpdateInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (params: {
      id: string;
      category: InquiryCategory;
      productId?: number;
      title: string;
      content: string;
    }) => {
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return updateInquiry(params);
    },
    onSuccess: () => {
      if (user?.id)
        queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
    },
  });
};

export const useDeleteInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (id: string) => {
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return deleteInquiry(id);
    },
    onSuccess: () => {
      if (user?.id)
        queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
    },
  });
};

/** 문의 폼 상품 검색 쿼리 */
export const useProductSearchForInquiry = (query: string) =>
  useQuery({
    queryKey: inquiryKeys.productSearch(query),
    queryFn: () => searchProductsForInquiry(query),
    staleTime: 1000 * 30,
  });
