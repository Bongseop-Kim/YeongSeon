import { useAuthStore } from "@/shared/store/auth";

export const useRequiredUser = (): string => {
  const { user, initialized } = useAuthStore();
  if (!initialized) {
    throw new Error("인증 상태를 확인하는 중입니다.");
  }
  if (!user?.id) throw new Error("로그인 후 이용할 수 있어요.");
  return user.id;
};
