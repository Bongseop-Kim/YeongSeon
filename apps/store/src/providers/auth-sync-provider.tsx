import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@yeongseon/supabase";
import { authKeys } from "@/features/auth/api/auth.query";
import { useAuthStore } from "@/store/auth";

/**
 * 인증 상태 변경을 감지하여 TanStack Query 캐시와 Zustand store를 동기화하는 Provider
 *
 * 책임:
 * - Supabase 인증 이벤트를 감지하여 세션 상태 동기화
 *
 * Supabase는 자동으로 토큰 갱신을 처리합니다 (autoRefreshToken 기본 활성화).
 * access token 만료 시 refresh token을 사용하여 자동으로 재발급합니다.
 */
export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 초기 세션 가져오기
    const initializeSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // TanStack Query 캐시 업데이트
        queryClient.setQueryData(authKeys.session(), session);

        // Zustand store 동기화
        useAuthStore.setState({
          user: session?.user ?? null,
          initialized: true,
        });
      } catch (error) {
        console.error("Failed to initialize session:", error);
        useAuthStore.setState({ initialized: true });
      }
    };

    initializeSession();

    // 세션 변경 감지 구독
    // Supabase의 자동 토큰 갱신도 이 이벤트로 감지됩니다
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // TanStack Query 캐시 업데이트
        queryClient.setQueryData(authKeys.session(), session);

        // Zustand store 동기화
        useAuthStore.setState({
          user: session?.user ?? null,
          initialized: true,
        });

        // TOKEN_REFRESHED 이벤트는 Supabase가 자동으로 토큰을 갱신했을 때 발생
        // 개발 모드에서만 로그 출력
        if (
          process.env.NODE_ENV === "development" &&
          event === "TOKEN_REFRESHED"
        ) {
          console.log("세션이 자동으로 갱신되었습니다.");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return <>{children}</>;
}
