import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * 현재 세션 가져오기
 */
export const getSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
};

/**
 * 인증 상태 변경 감지 구독
 * @param callback 세션 변경 시 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * OAuth 로그인
 * @throws {Error} 로그인 실패 시 에러 발생
 */
export const signInWithOAuth = async (
  provider: "kakao" | "google"
): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(`OAuth 로그인 실패: ${error.message}`);
  }
};

/**
 * 로그아웃
 * @throws {Error} 로그아웃 실패 시 에러 발생
 */
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`로그아웃 실패: ${error.message}`);
  }
};
