import { supabase } from "@/shared/lib/supabase";

export const requireUserId = async (): Promise<string> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return user.id;
};
