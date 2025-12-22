import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "./profile.api";
import { toast } from "@/lib/toast";

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
 * 프로필 업데이트 뮤테이션
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      // 프로필 쿼리 무효화하여 최신 데이터 가져오기
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      toast.success("프로필이 업데이트되었습니다.");
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "프로필 업데이트에 실패했습니다. 다시 시도해주세요.";
      toast.error(errorMessage);
    },
  });
};
