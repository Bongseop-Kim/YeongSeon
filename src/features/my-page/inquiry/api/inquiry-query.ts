import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
} from "./inquiry-api";
import { useAuthStore } from "@/store/auth";

/**
 * 문의 쿼리 키
 */
export const inquiryKeys = {
  all: ["inquiries"] as const,
  list: (userId?: string) => [...inquiryKeys.all, "list", userId] as const,
};

/**
 * 문의 목록 조회 쿼리
 */
export const useInquiries = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: inquiryKeys.list(user?.id),
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getInquiries();
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 문의 등록 뮤테이션
 */
export const useCreateInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (params: { title: string; content: string }) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return createInquiry({ userId: user.id, ...params });
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
      }
    },
  });
};

/**
 * 문의 수정 뮤테이션
 */
export const useUpdateInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (params: { id: string; title: string; content: string }) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return updateInquiry(params);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
      }
    },
  });
};

/**
 * 문의 삭제 뮤테이션
 */
export const useDeleteInquiry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (id: string) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return deleteInquiry(id);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: inquiryKeys.list(user.id) });
      }
    },
  });
};
