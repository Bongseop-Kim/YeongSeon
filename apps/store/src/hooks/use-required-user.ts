import { useAuthStore } from "@/store/auth";

export const useRequiredUser = (): string => {
  const { user } = useAuthStore();
  if (!user?.id) throw new Error("로그인이 필요합니다.");
  return user.id;
};
