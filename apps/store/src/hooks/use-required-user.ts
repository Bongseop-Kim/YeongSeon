import { useAuthStore } from "@/store/auth";

export const useRequiredUser = (): string => {
  const { user, initialized } = useAuthStore();
  if (!initialized) {
    throw new Error("인증 상태를 확인하는 중입니다.");
  }
  if (!user?.id) throw new Error("로그인이 필요합니다.");
  return user.id;
};
