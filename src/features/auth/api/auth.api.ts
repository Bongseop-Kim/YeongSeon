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

/**
 * 회원탈퇴
 * Edge Function을 호출하여 유저 삭제
 */
export const deleteAccount = async (): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("로그인이 필요합니다.");
  }

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "회원탈퇴에 실패했습니다.");
  }
};
