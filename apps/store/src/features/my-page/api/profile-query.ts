import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateMarketingConsent } from "./profile-api";
import type {
  MarketingConsent,
  UserProfile,
} from "@/features/my-page/types/profile";
import { toast } from "@/shared/lib/toast";

/**
 * 프로필 쿼리 키
 */
export const profileKeys = {
  all: ["profile"] as const,
  detail: () => [...profileKeys.all, "detail"] as const,
};

/**
 * 현재 사용자의 프로필 조회 쿼리
 */
export const useProfile = () => {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: getProfile,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};

/**
 * 마케팅 동의 업데이트 뮤테이션
 * optimistic update 적용, 실패 시 이전 캐시로 롤백
 */
export const useUpdateMarketingConsent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarketingConsent) => updateMarketingConsent(input),
    onMutate: async (nextConsent) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.detail() });

      const previousProfile = queryClient.getQueryData<UserProfile>(
        profileKeys.detail(),
      );

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(profileKeys.detail(), {
          ...previousProfile,
          marketingConsent: nextConsent,
        });
      }

      return { previousProfile };
    },
    onError: (error, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.detail(), context.previousProfile);
      }

      console.error("Marketing consent update error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "마케팅 동의 저장에 실패했습니다. 다시 시도해주세요.";
      toast.error(errorMessage);
    },
    onSuccess: () => {
      toast.success("수신 동의 설정이 저장되었습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
    },
  });
};
