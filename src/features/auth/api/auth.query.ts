import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSession,
  signInWithOAuth,
  signOut as signOutApi,
  deleteAccount,
} from "./auth.api";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth";

/**
 * 세션 쿼리 키
 */
export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
};

/**
 * 현재 세션 조회 쿼리
 * 세션 변경은 전역에서 감지되므로 이 훅은 단순히 캐시된 세션을 반환합니다.
 */
export const useSession = () => {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: getSession,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnMount: false,
    refetchOnWindowFocus: true, // 보안을 위해 윈도우 포커스 시 세션 확인
    retry: 1,
  });
};

/**
 * OAuth 로그인 뮤테이션
 */
export const useSignIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: "kakao" | "google") => signInWithOAuth(provider),
    onSuccess: () => {
      // 로그인 성공 후 세션 쿼리 무효화하여 최신 세션 가져오기
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
    onError: (error) => {
      console.error("Sign in error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "로그인에 실패했습니다. 다시 시도해주세요.";
      toast.error(errorMessage);
    },
  });
};

/**
 * 로그아웃 뮤테이션
 */
export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOutApi,
    onSuccess: () => {
      // 세션 쿼리 무효화 및 캐시 초기화
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
    onError: (error) => {
      console.error("Sign out error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "로그아웃에 실패했습니다. 다시 시도해주세요.";
      toast.error(errorMessage);
    },
  });
};

/**
 * 회원탈퇴 뮤테이션
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.clear();
      useAuthStore.setState({ user: null, initialized: false });
    },
  });
};
